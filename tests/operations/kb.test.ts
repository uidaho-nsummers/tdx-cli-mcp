import { describe, expect, test, vi } from "vitest";
import {
	kbGetInputSchema,
	kbSearchInputSchema,
} from "../../packages/core/src/schemas/kb.ts";

const { mockTdxRequest } = vi.hoisted(() => ({
	mockTdxRequest: vi.fn<
		(...args: unknown[]) => Promise<{ data: unknown; headers: Headers }>
	>(() =>
		Promise.resolve({
			data: { ID: 1, Subject: "Test Article" },
			headers: new Headers(),
		}),
	),
}));

vi.mock("../../packages/core/src/api/client.ts", () => ({
	tdxRequest: mockTdxRequest,
}));

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

describe("knowledge base operations", () => {
	describe("kbSearch", () => {
		test("posts to knowledgebase search and returns raw data", async () => {
			mockTdxRequest.mockImplementation(() =>
				Promise.resolve({ data: [{ ID: 1 }], headers: new Headers() }),
			);

			const { kbSearch } = await import(
				"../../packages/core/src/operations/kb.ts"
			);
			const result = await kbSearch({ SearchText: "vpn", ReturnCount: 5 });

			expect(result).toEqual([{ ID: 1 }]);
			expect(mockTdxRequest).toHaveBeenCalledWith({
				method: "POST",
				path: "/20/knowledgebase/search",
				body: { SearchText: "vpn", ReturnCount: 5 },
			});
		});

		test("applies schema defaults for direct core callers", async () => {
			mockTdxRequest.mockImplementation(() =>
				Promise.resolve({ data: [], headers: new Headers() }),
			);

			const { kbSearch } = await import(
				"../../packages/core/src/operations/kb.ts"
			);
			await kbSearch({});

			expect(mockTdxRequest).toHaveBeenLastCalledWith({
				method: "POST",
				path: "/20/knowledgebase/search",
				body: { ReturnCount: 25 },
			});
		});
	});

	describe("kbGet", () => {
		test("gets article by ID and returns raw object", async () => {
			mockTdxRequest.mockImplementation(() =>
				Promise.resolve({
					data: { ID: 31, Subject: "How to VPN" },
					headers: new Headers(),
				}),
			);

			const { kbGet } = await import(
				"../../packages/core/src/operations/kb.ts"
			);
			const result = (await kbGet({ id: 31 })) as { ID: number };

			expect(mockTdxRequest).toHaveBeenCalledWith({
				path: "/20/knowledgebase/31",
			});
			expect(result.ID).toBe(31);
		});
	});
});

describe("knowledge base Zod schema validation", () => {
	test("kbSearchInputSchema accepts empty object", () => {
		expect(kbSearchInputSchema.safeParse({}).success).toBe(true);
	});

	test("kbSearchInputSchema rejects ReturnCount of 0", () => {
		expect(kbSearchInputSchema.safeParse({ ReturnCount: 0 }).success).toBe(
			false,
		);
	});

	test("kbGetInputSchema accepts positive ID", () => {
		expect(kbGetInputSchema.safeParse({ id: 5 }).success).toBe(true);
	});

	test("kbGetInputSchema rejects negative ID", () => {
		expect(kbGetInputSchema.safeParse({ id: -1 }).success).toBe(false);
	});
});
