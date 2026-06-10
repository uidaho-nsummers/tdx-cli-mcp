import { beforeEach, describe, expect, test, vi } from "vitest";

// Helper to create a valid JWT with a given exp timestamp
function makeJwt(exp: number): string {
	const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
	const payload = btoa(JSON.stringify({ exp }));
	return `${header}.${payload}.fake-signature`;
}

// Mock the config module BEFORE any imports that depend on it
vi.mock("../../src/config.ts", () => ({
	getConfig: () => ({
		TDX_BASE_URL: "https://tdx.example.com/TDWebApi/api",
		TDX_BEID: "test-beid",
		TDX_WEB_SERVICES_KEY: "test-key",
		TDX_TICKETING_APP_ID: 42,
		TDX_ASSET_APP_ID: 10,
		TDX_KB_APP_ID: 20,
	}),
}));

// Store original fetch
const originalFetch = globalThis.fetch;

describe("auth client", () => {
	beforeEach(() => {
		// Reset fetch mock
		globalThis.fetch = originalFetch;
	});

	async function freshGetAuthToken(): Promise<() => Promise<string>> {
		// Reset the module registry to get a fresh module with fresh state
		vi.resetModules();
		const mod = await import("../../src/auth/client.ts");
		return mod.getAuthToken;
	}

	describe("successful login", () => {
		test("returns JWT from TDX API", async () => {
			const futureExp = Math.floor(Date.now() / 1000) + 3600;
			const token = makeJwt(futureExp);

			globalThis.fetch = vi.fn(() =>
				Promise.resolve(new Response(token, { status: 200 })),
			) as unknown as typeof fetch;

			const getAuthToken = await freshGetAuthToken();
			const result = await getAuthToken();
			expect(result).toBe(token);
		});

		test("sends correct credentials to loginadmin endpoint", async () => {
			const futureExp = Math.floor(Date.now() / 1000) + 3600;
			const token = makeJwt(futureExp);

			const mockFetch = vi.fn(() =>
				Promise.resolve(new Response(token, { status: 200 })),
			);
			globalThis.fetch = mockFetch as unknown as typeof fetch;

			const getAuthToken = await freshGetAuthToken();
			await getAuthToken();

			expect(mockFetch).toHaveBeenCalledTimes(1);
			const [url, opts] = mockFetch.mock.calls[0] as unknown as [
				string,
				RequestInit,
			];
			expect(url).toBe("https://tdx.example.com/TDWebApi/api/auth/loginadmin");
			expect(opts.method).toBe("POST");
			expect(JSON.parse(opts.body as string)).toEqual({
				BEID: "test-beid",
				WebServicesKey: "test-key",
			});
		});
	});

	describe("token caching", () => {
		test("returns cached token on subsequent calls without re-fetching", async () => {
			const futureExp = Math.floor(Date.now() / 1000) + 3600;
			const token = makeJwt(futureExp);

			const mockFetch = vi.fn(() =>
				Promise.resolve(new Response(token, { status: 200 })),
			);
			globalThis.fetch = mockFetch as unknown as typeof fetch;

			const getAuthToken = await freshGetAuthToken();
			const first = await getAuthToken();
			const second = await getAuthToken();

			expect(first).toBe(token);
			expect(second).toBe(token);
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});
	});

	describe("proactive refresh before expiry", () => {
		test("refreshes token within 5 minutes of expiry", async () => {
			// First token expires in 4 minutes (within 5-minute REFRESH_BUFFER_MS)
			const nearExp = Math.floor(Date.now() / 1000) + 4 * 60;
			const nearToken = makeJwt(nearExp);

			// Second token expires in 1 hour
			const farExp = Math.floor(Date.now() / 1000) + 3600;
			const farToken = makeJwt(farExp);

			let callCount = 0;
			globalThis.fetch = vi.fn(() => {
				callCount++;
				const t = callCount === 1 ? nearToken : farToken;
				return Promise.resolve(new Response(t, { status: 200 }));
			}) as unknown as typeof fetch;

			const getAuthToken = await freshGetAuthToken();

			// First call gets the near-expiry token
			const first = await getAuthToken();
			expect(first).toBe(nearToken);

			// Second call should refresh because token is within 5-min buffer
			const second = await getAuthToken();
			expect(second).toBe(farToken);
		});
	});

	describe("login failure handling", () => {
		test("throws on 401 response", async () => {
			globalThis.fetch = vi.fn(() =>
				Promise.resolve(
					new Response("Unauthorized", {
						status: 401,
						statusText: "Unauthorized",
					}),
				),
			) as unknown as typeof fetch;

			const getAuthToken = await freshGetAuthToken();
			await expect(getAuthToken()).rejects.toThrow("Auth failed: 401");
		});

		test("throws on 500 response", async () => {
			globalThis.fetch = vi.fn(() =>
				Promise.resolve(
					new Response("Server Error", {
						status: 500,
						statusText: "Internal Server Error",
					}),
				),
			) as unknown as typeof fetch;

			const getAuthToken = await freshGetAuthToken();
			await expect(getAuthToken()).rejects.toThrow("Auth failed: 500");
		});

		test("throws on empty token response", async () => {
			globalThis.fetch = vi.fn(() =>
				Promise.resolve(new Response("", { status: 200 })),
			) as unknown as typeof fetch;

			const getAuthToken = await freshGetAuthToken();
			await expect(getAuthToken()).rejects.toThrow("Auth returned empty token");
		});
	});

	describe("malformed JWT handling", () => {
		test("throws on JWT with wrong number of parts", async () => {
			globalThis.fetch = vi.fn(() =>
				Promise.resolve(new Response("not.a.valid.jwt.token", { status: 200 })),
			) as unknown as typeof fetch;

			const getAuthToken = await freshGetAuthToken();
			await expect(getAuthToken()).rejects.toThrow();
		});

		test("throws on JWT without exp claim", async () => {
			const header = btoa(JSON.stringify({ alg: "HS256" }));
			const payload = btoa(JSON.stringify({ sub: "user" })); // no exp
			const badToken = `${header}.${payload}.sig`;

			globalThis.fetch = vi.fn(() =>
				Promise.resolve(new Response(badToken, { status: 200 })),
			) as unknown as typeof fetch;

			const getAuthToken = await freshGetAuthToken();
			await expect(getAuthToken()).rejects.toThrow("JWT missing exp claim");
		});

		test("throws on JWT with non-base64 payload", async () => {
			globalThis.fetch = vi.fn(() =>
				Promise.resolve(
					new Response("a.!!!invalid-base64!!!.c", { status: 200 }),
				),
			) as unknown as typeof fetch;

			const getAuthToken = await freshGetAuthToken();
			await expect(getAuthToken()).rejects.toThrow();
		});
	});
});
