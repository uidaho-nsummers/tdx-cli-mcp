import { describe, expect, test, vi } from "vitest";
import { applicationsListInputSchema } from "../../packages/core/src/schemas/applications.ts";

const { mockTdxRequest } = vi.hoisted(() => ({
	mockTdxRequest: vi.fn<
		(...args: unknown[]) => Promise<{ data: unknown; headers: Headers }>
	>(() =>
		Promise.resolve({
			data: [{ ID: 1, Name: "Tickets" }],
			headers: new Headers(),
		}),
	),
}));

vi.mock("../../packages/core/src/api/client.ts", () => ({
	tdxRequest: mockTdxRequest,
}));

describe("applications operations", () => {
	describe("applicationsList", () => {
		test("gets applications and returns raw data", async () => {
			mockTdxRequest.mockImplementation(() =>
				Promise.resolve({
					data: [{ ID: 1, Name: "Tickets" }],
					headers: new Headers(),
				}),
			);

			const { applicationsList } = await import(
				"../../packages/core/src/operations/applications.ts"
			);
			const result = await applicationsList();

			expect(result).toEqual([{ ID: 1, Name: "Tickets" }]);
			expect(mockTdxRequest).toHaveBeenCalledWith({
				path: "/applications",
			});
		});
	});
});

describe("applications Zod schema validation", () => {
	test("applicationsListInputSchema accepts empty object", () => {
		expect(applicationsListInputSchema.safeParse({}).success).toBe(true);
	});
});
