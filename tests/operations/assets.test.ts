import { describe, expect, test, vi } from "vitest";
import {
	assetGetInputSchema,
	assetSearchInputSchema,
} from "../../packages/core/src/schemas/assets.ts";

const { mockTdxRequest } = vi.hoisted(() => ({
	mockTdxRequest: vi.fn<
		(...args: unknown[]) => Promise<{ data: unknown; headers: Headers }>
	>(() =>
		Promise.resolve({
			data: { ID: 1, Name: "Test Asset" },
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

describe("asset operations", () => {
	describe("assetsSearch", () => {
		test("posts to asset search and returns raw data", async () => {
			mockTdxRequest.mockImplementation(() =>
				Promise.resolve({ data: [{ ID: 1 }], headers: new Headers() }),
			);

			const { assetsSearch } = await import(
				"../../packages/core/src/operations/assets.ts"
			);
			const result = await assetsSearch({
				SearchText: "laptop",
				MaxResults: 5,
			});

			expect(result).toEqual([{ ID: 1 }]);
			expect(mockTdxRequest).toHaveBeenCalledWith({
				method: "POST",
				path: "/10/assets/search",
				body: { SearchText: "laptop", MaxResults: 5 },
			});
		});

		test("applies schema defaults for direct core callers", async () => {
			mockTdxRequest.mockImplementation(() =>
				Promise.resolve({ data: [], headers: new Headers() }),
			);

			const { assetsSearch } = await import(
				"../../packages/core/src/operations/assets.ts"
			);
			await assetsSearch({});

			expect(mockTdxRequest).toHaveBeenLastCalledWith({
				method: "POST",
				path: "/10/assets/search",
				body: { MaxResults: 25 },
			});
		});
	});

	describe("assetsGet", () => {
		test("gets asset by ID and returns raw object", async () => {
			mockTdxRequest.mockImplementation(() =>
				Promise.resolve({
					data: { ID: 77, Name: "Server" },
					headers: new Headers(),
				}),
			);

			const { assetsGet } = await import(
				"../../packages/core/src/operations/assets.ts"
			);
			const result = (await assetsGet({ id: 77 })) as { ID: number };

			expect(mockTdxRequest).toHaveBeenCalledWith({
				path: "/10/assets/77",
			});
			expect(result.ID).toBe(77);
		});
	});
});

describe("asset Zod schema validation", () => {
	test("assetSearchInputSchema accepts empty object", () => {
		expect(assetSearchInputSchema.safeParse({}).success).toBe(true);
	});

	test("assetSearchInputSchema rejects MaxResults of 0", () => {
		expect(assetSearchInputSchema.safeParse({ MaxResults: 0 }).success).toBe(
			false,
		);
	});

	test("assetGetInputSchema accepts positive ID", () => {
		expect(assetGetInputSchema.safeParse({ id: 5 }).success).toBe(true);
	});

	test("assetGetInputSchema rejects zero ID", () => {
		expect(assetGetInputSchema.safeParse({ id: 0 }).success).toBe(false);
	});
});
