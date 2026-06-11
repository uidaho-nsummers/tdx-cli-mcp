import { describe, expect, test, vi } from "vitest";
import {
	peopleGetInputSchema,
	peopleSearchInputSchema,
} from "../../packages/core/src/schemas/people.ts";

const { mockTdxRequest } = vi.hoisted(() => ({
	mockTdxRequest: vi.fn<
		(...args: unknown[]) => Promise<{ data: unknown; headers: Headers }>
	>(() =>
		Promise.resolve({
			data: { UID: "abc", FullName: "Test Person" },
			headers: new Headers(),
		}),
	),
}));

vi.mock("../../packages/core/src/api/client.ts", () => ({
	tdxRequest: mockTdxRequest,
}));

describe("people operations", () => {
	describe("peopleSearch", () => {
		test("posts to people search and returns raw data", async () => {
			mockTdxRequest.mockImplementation(() =>
				Promise.resolve({ data: [{ UID: "abc" }], headers: new Headers() }),
			);

			const { peopleSearch } = await import(
				"../../packages/core/src/operations/people.ts"
			);
			const result = await peopleSearch({ SearchText: "jane", MaxResults: 5 });

			expect(result).toEqual([{ UID: "abc" }]);
			expect(mockTdxRequest).toHaveBeenCalledWith({
				method: "POST",
				path: "/people/search",
				body: { SearchText: "jane", MaxResults: 5 },
			});
		});

		test("applies schema defaults for direct core callers", async () => {
			mockTdxRequest.mockImplementation(() =>
				Promise.resolve({ data: [], headers: new Headers() }),
			);

			const { peopleSearch } = await import(
				"../../packages/core/src/operations/people.ts"
			);
			await peopleSearch({});

			expect(mockTdxRequest).toHaveBeenLastCalledWith({
				method: "POST",
				path: "/people/search",
				body: { MaxResults: 25 },
			});
		});
	});

	describe("peopleGet", () => {
		test("gets person by UID and returns raw object", async () => {
			mockTdxRequest.mockImplementation(() =>
				Promise.resolve({
					data: { UID: "550e8400-e29b-41d4-a716-446655440000" },
					headers: new Headers(),
				}),
			);

			const { peopleGet } = await import(
				"../../packages/core/src/operations/people.ts"
			);
			const result = (await peopleGet({
				uid: "550e8400-e29b-41d4-a716-446655440000",
			})) as { UID: string };

			expect(mockTdxRequest).toHaveBeenCalledWith({
				path: "/people/550e8400-e29b-41d4-a716-446655440000",
			});
			expect(result.UID).toBe("550e8400-e29b-41d4-a716-446655440000");
		});
	});
});

describe("people Zod schema validation", () => {
	test("peopleSearchInputSchema accepts empty object", () => {
		expect(peopleSearchInputSchema.safeParse({}).success).toBe(true);
	});

	test("peopleSearchInputSchema rejects MaxResults of 0", () => {
		expect(peopleSearchInputSchema.safeParse({ MaxResults: 0 }).success).toBe(
			false,
		);
	});

	test("peopleGetInputSchema accepts valid UUID", () => {
		expect(
			peopleGetInputSchema.safeParse({
				uid: "550e8400-e29b-41d4-a716-446655440000",
			}).success,
		).toBe(true);
	});

	test("peopleGetInputSchema rejects non-UUID", () => {
		expect(peopleGetInputSchema.safeParse({ uid: "not-a-uuid" }).success).toBe(
			false,
		);
	});
});
