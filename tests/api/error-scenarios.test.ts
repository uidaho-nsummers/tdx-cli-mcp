import { beforeEach, describe, expect, test, vi } from "vitest";

// Mock config
vi.mock("../../packages/core/src/config.ts", () => ({
	getConfig: () => ({
		TDX_BASE_URL: "https://tdx.example.com/TDWebApi/api",
		TDX_BEID: "test-beid",
		TDX_WEB_SERVICES_KEY: "test-key",
		TDX_TICKETING_APP_ID: 42,
		TDX_ASSET_APP_ID: 10,
		TDX_KB_APP_ID: 20,
	}),
}));

// Mock auth
const { mockClearAuthToken, mockGetAuthToken } = vi.hoisted(() => ({
	mockClearAuthToken: vi.fn(),
	mockGetAuthToken: vi.fn(() => Promise.resolve("mock-token")),
}));
vi.mock("../../packages/core/src/auth/client.ts", () => ({
	clearAuthToken: mockClearAuthToken,
	getAuthToken: mockGetAuthToken,
}));

// Mock rate limiter to avoid long waits in tests
vi.mock("../../packages/core/src/api/rate-limiter.ts", () => ({
	waitIfNeeded: vi.fn(() => Promise.resolve()),
	recordCall: vi.fn(() => {}),
	getRetryWaitMs: vi.fn(() => 10), // Very short retry wait for tests
}));

// Store original fetch
const originalFetch = globalThis.fetch;

describe("error scenarios", () => {
	beforeEach(() => {
		vi.resetModules();
		globalThis.fetch = originalFetch;
		mockClearAuthToken.mockClear();
		mockGetAuthToken.mockImplementation(() => Promise.resolve("mock-token"));
	});

	describe("401 triggers error", () => {
		test("throws TdxApiError on 401 response", async () => {
			globalThis.fetch = vi.fn(() =>
				Promise.resolve(
					new Response("Unauthorized", {
						status: 401,
						statusText: "Unauthorized",
					}),
				),
			) as unknown as typeof fetch;

			const { tdxRequest, TdxApiError } = await import(
				"../../packages/core/src/api/client.ts"
			);
			try {
				await tdxRequest({ path: "/test-401" });
				expect(true).toBe(false); // should not reach here
			} catch (e) {
				expect(e).toBeInstanceOf(TdxApiError);
				expect((e as InstanceType<typeof TdxApiError>).status).toBe(401);
				expect(mockClearAuthToken).toHaveBeenCalledTimes(1);
			}
		});
	});

	describe("429 triggers rate limit backoff and retry", () => {
		test("retries on 429 and succeeds on subsequent attempt", async () => {
			let callCount = 0;
			globalThis.fetch = vi.fn(() => {
				callCount++;
				if (callCount === 1) {
					return Promise.resolve(
						new Response("Rate Limited", {
							status: 429,
							statusText: "Too Many Requests",
						}),
					);
				}
				return Promise.resolve(
					new Response(JSON.stringify({ ok: true }), { status: 200 }),
				);
			}) as unknown as typeof fetch;

			const { tdxRequest } = await import(
				"../../packages/core/src/api/client.ts"
			);
			const result = await tdxRequest({ path: "/test-429-retry" });
			expect(result.data).toEqual({ ok: true });
			expect(callCount).toBe(2);
		});

		test("throws after max retries on persistent 429", async () => {
			globalThis.fetch = vi.fn(() =>
				Promise.resolve(
					new Response("Rate Limited", {
						status: 429,
						statusText: "Too Many Requests",
					}),
				),
			) as unknown as typeof fetch;

			const { tdxRequest } = await import(
				"../../packages/core/src/api/client.ts"
			);
			await expect(tdxRequest({ path: "/test-429-exhaust" })).rejects.toThrow(
				"429",
			);
		});
	});

	describe("500 returns meaningful error", () => {
		test("throws TdxApiError with status and body on 500", async () => {
			globalThis.fetch = vi.fn(() =>
				Promise.resolve(
					new Response("Internal Server Error details", {
						status: 500,
						statusText: "Internal Server Error",
					}),
				),
			) as unknown as typeof fetch;

			const { tdxRequest, TdxApiError } = await import(
				"../../packages/core/src/api/client.ts"
			);
			try {
				await tdxRequest({ path: "/test-500" });
				expect(true).toBe(false);
			} catch (e) {
				expect(e).toBeInstanceOf(TdxApiError);
				const err = e as InstanceType<typeof TdxApiError>;
				expect(err.status).toBe(500);
				expect(err.body).toBe("Internal Server Error details");
			}
		});
	});

	describe("malformed JSON response handling", () => {
		test("throws on malformed JSON in response body", async () => {
			globalThis.fetch = vi.fn(() =>
				Promise.resolve(new Response("this is not json{{{", { status: 200 })),
			) as unknown as typeof fetch;

			const { tdxRequest } = await import(
				"../../packages/core/src/api/client.ts"
			);
			await expect(tdxRequest({ path: "/test-badjson" })).rejects.toThrow();
		});

		test("handles empty response body gracefully", async () => {
			globalThis.fetch = vi.fn(() =>
				Promise.resolve(new Response("", { status: 200 })),
			) as unknown as typeof fetch;

			const { tdxRequest } = await import(
				"../../packages/core/src/api/client.ts"
			);
			const result = await tdxRequest({ path: "/test-empty" });
			expect(result.data).toBeUndefined();
		});
	});

	describe("network timeout handling", () => {
		test("propagates fetch errors (network failure)", async () => {
			globalThis.fetch = vi.fn(() =>
				Promise.reject(new TypeError("Failed to fetch")),
			) as unknown as typeof fetch;

			const { tdxRequest } = await import(
				"../../packages/core/src/api/client.ts"
			);
			await expect(tdxRequest({ path: "/test-network" })).rejects.toThrow(
				"Failed to fetch",
			);
		});
	});
});
