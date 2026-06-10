import { describe, expect, test, vi } from "vitest";
import {
	ticketCreateInputSchema,
	ticketFeedPostInputSchema,
	ticketGetInputSchema,
	ticketSearchInputSchema,
	ticketUpdateInputSchema,
} from "../../src/tools/schemas/tickets.ts";

// Mock the API client
const { mockTdxRequest } = vi.hoisted(() => ({
	mockTdxRequest: vi.fn<
		(...args: unknown[]) => Promise<{ data: unknown; headers: Headers }>
	>(() =>
		Promise.resolve({
			data: { ID: 1, Title: "Test Ticket" },
			headers: new Headers(),
		}),
	),
}));

vi.mock("@tdx/core", () => ({
	getConfig: () => ({
		TDX_BASE_URL: "https://tdx.example.com/TDWebApi/api",
		TDX_BEID: "test-beid",
		TDX_WEB_SERVICES_KEY: "test-key",
		TDX_TICKETING_APP_ID: 42,
		TDX_ASSET_APP_ID: 10,
		TDX_KB_APP_ID: 20,
	}),
	tdxRequest: mockTdxRequest,
	TdxApiError: class TdxApiError extends Error {
		constructor(
			public status: number,
			public statusText: string,
			public body: string,
		) {
			super(`TDX API error ${status}: ${statusText}`);
		}
	},
	getAuthToken: vi.fn(() => Promise.resolve("mock-token")),
	clearAuthToken: vi.fn(),
}));

describe("ticket tool handlers", () => {
	describe("ticketsSearch", () => {
		test("calls tdxRequest with correct method and path", async () => {
			mockTdxRequest.mockImplementation(() =>
				Promise.resolve({ data: [{ ID: 1 }], headers: new Headers() }),
			);

			const { ticketsSearch } = await import("../../src/tools/tickets.ts");
			const result = await ticketsSearch({ MaxResults: 10 });

			expect(result.content[0]?.type).toBe("text");
			expect(mockTdxRequest).toHaveBeenCalledWith({
				method: "POST",
				path: "/42/tickets/search",
				body: { MaxResults: 10 },
			});
		});

		test("passes filter params correctly", async () => {
			mockTdxRequest.mockImplementation(() =>
				Promise.resolve({ data: [], headers: new Headers() }),
			);

			const { ticketsSearch } = await import("../../src/tools/tickets.ts");
			await ticketsSearch({
				SearchText: "test",
				StatusIDs: [1, 2],
				PriorityIDs: [3],
				MaxResults: 5,
			});

			expect(mockTdxRequest).toHaveBeenCalledWith({
				method: "POST",
				path: "/42/tickets/search",
				body: {
					SearchText: "test",
					StatusIDs: [1, 2],
					PriorityIDs: [3],
					MaxResults: 5,
				},
			});
		});
	});

	describe("ticketsGet", () => {
		test("calls tdxRequest with ticket ID in path", async () => {
			mockTdxRequest.mockImplementation(() =>
				Promise.resolve({
					data: { ID: 123, Title: "Bug" },
					headers: new Headers(),
				}),
			);

			const { ticketsGet } = await import("../../src/tools/tickets.ts");
			const result = await ticketsGet({ id: 123 });

			expect(mockTdxRequest).toHaveBeenCalledWith({
				path: "/42/tickets/123",
			});
			const parsed = JSON.parse((result.content[0] as { text: string }).text);
			expect(parsed.ID).toBe(123);
		});
	});

	describe("ticketsCreate", () => {
		test("sends body and notification query params", async () => {
			mockTdxRequest.mockImplementation(() =>
				Promise.resolve({ data: { ID: 999 }, headers: new Headers() }),
			);

			const { ticketsCreate } = await import("../../src/tools/tickets.ts");
			await ticketsCreate({
				TypeID: 1,
				Title: "New Ticket",
				NotifyRequestor: true,
				NotifyResponsible: false,
				EnableNotifyReviewer: false,
				AllowRequestorCreation: false,
				applyDefaults: true,
			});

			expect(mockTdxRequest).toHaveBeenCalledWith({
				method: "POST",
				path: "/42/tickets",
				body: { TypeID: 1, Title: "New Ticket" },
				query: {
					NotifyRequestor: "true",
					NotifyResponsible: "false",
					EnableNotifyReviewer: "false",
					AllowRequestorCreation: "false",
					applyDefaults: "true",
				},
			});
		});
	});

	describe("ticketsUpdate", () => {
		test("sends PATCH with patches array and query param", async () => {
			mockTdxRequest.mockImplementation(() =>
				Promise.resolve({ data: { ID: 123 }, headers: new Headers() }),
			);

			const { ticketsUpdate } = await import("../../src/tools/tickets.ts");
			await ticketsUpdate({
				id: 123,
				patches: [{ op: "replace", path: "/Title", value: "Updated" }],
				notifyNewResponsible: true,
			});

			expect(mockTdxRequest).toHaveBeenCalledWith({
				method: "PATCH",
				path: "/42/tickets/123",
				body: [{ op: "replace", path: "/Title", value: "Updated" }],
				query: { notifyNewResponsible: "true" },
			});
		});
	});

	describe("ticketsFeedGet", () => {
		test("gets feed for ticket ID", async () => {
			mockTdxRequest.mockImplementation(() =>
				Promise.resolve({
					data: [{ ID: 1, Body: "Comment" }],
					headers: new Headers(),
				}),
			);

			const { ticketsFeedGet } = await import("../../src/tools/tickets.ts");
			const result = await ticketsFeedGet({ id: 456 });

			expect(mockTdxRequest).toHaveBeenCalledWith({
				path: "/42/tickets/456/feed",
			});
			expect(result.content[0]?.type).toBe("text");
		});
	});

	describe("ticketsFeedPost", () => {
		test("posts comment to ticket feed", async () => {
			mockTdxRequest.mockImplementation(() =>
				Promise.resolve({ data: { ID: 1 }, headers: new Headers() }),
			);

			const { ticketsFeedPost } = await import("../../src/tools/tickets.ts");
			await ticketsFeedPost({
				id: 456,
				Comments: "Hello world",
				IsPrivate: false,
			});

			expect(mockTdxRequest).toHaveBeenCalledWith({
				method: "POST",
				path: "/42/tickets/456/feed",
				body: { Comments: "Hello world", IsPrivate: false },
			});
		});
	});
});

describe("ticket Zod schema validation", () => {
	describe("ticketSearchInputSchema", () => {
		test("accepts valid search input", () => {
			const result = ticketSearchInputSchema.safeParse({
				SearchText: "test",
				MaxResults: 10,
			});
			expect(result.success).toBe(true);
		});

		test("accepts empty object (all optional)", () => {
			const result = ticketSearchInputSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		test("rejects MaxResults of 0", () => {
			const result = ticketSearchInputSchema.safeParse({ MaxResults: 0 });
			expect(result.success).toBe(false);
		});

		test("rejects non-integer StatusIDs", () => {
			const result = ticketSearchInputSchema.safeParse({
				StatusIDs: [1.5],
			});
			expect(result.success).toBe(false);
		});

		test("rejects SearchText exceeding 500 characters", () => {
			const result = ticketSearchInputSchema.safeParse({
				SearchText: "a".repeat(501),
			});
			expect(result.success).toBe(false);
		});

		test("accepts SearchText at exactly 500 characters", () => {
			const result = ticketSearchInputSchema.safeParse({
				SearchText: "a".repeat(500),
			});
			expect(result.success).toBe(true);
		});
	});

	describe("ticketGetInputSchema", () => {
		test("accepts valid ticket ID", () => {
			const result = ticketGetInputSchema.safeParse({ id: 123 });
			expect(result.success).toBe(true);
		});

		test("rejects negative ID", () => {
			const result = ticketGetInputSchema.safeParse({ id: -1 });
			expect(result.success).toBe(false);
		});

		test("rejects zero ID", () => {
			const result = ticketGetInputSchema.safeParse({ id: 0 });
			expect(result.success).toBe(false);
		});

		test("rejects non-integer ID", () => {
			const result = ticketGetInputSchema.safeParse({ id: 1.5 });
			expect(result.success).toBe(false);
		});

		test("rejects missing ID", () => {
			const result = ticketGetInputSchema.safeParse({});
			expect(result.success).toBe(false);
		});
	});

	describe("ticketCreateInputSchema", () => {
		test("accepts valid create input", () => {
			const result = ticketCreateInputSchema.safeParse({
				TypeID: 1,
				Title: "Test Ticket",
			});
			expect(result.success).toBe(true);
		});

		test("rejects missing Title", () => {
			const result = ticketCreateInputSchema.safeParse({ TypeID: 1 });
			expect(result.success).toBe(false);
		});

		test("rejects empty Title", () => {
			const result = ticketCreateInputSchema.safeParse({
				TypeID: 1,
				Title: "",
			});
			expect(result.success).toBe(false);
		});

		test("rejects missing TypeID", () => {
			const result = ticketCreateInputSchema.safeParse({
				Title: "Test",
			});
			expect(result.success).toBe(false);
		});

		test("rejects invalid RequestorEmail", () => {
			const result = ticketCreateInputSchema.safeParse({
				TypeID: 1,
				Title: "Test",
				RequestorEmail: "not-an-email",
			});
			expect(result.success).toBe(false);
		});

		test("rejects non-UUID RequestorUid", () => {
			const result = ticketCreateInputSchema.safeParse({
				TypeID: 1,
				Title: "Test",
				RequestorUid: "not-a-uuid",
			});
			expect(result.success).toBe(false);
		});

		test("accepts valid UUID RequestorUid", () => {
			const result = ticketCreateInputSchema.safeParse({
				TypeID: 1,
				Title: "Test",
				RequestorUid: "550e8400-e29b-41d4-a716-446655440000",
			});
			expect(result.success).toBe(true);
		});

		test("rejects non-UUID ResponsibleUid", () => {
			const result = ticketCreateInputSchema.safeParse({
				TypeID: 1,
				Title: "Test",
				ResponsibleUid: "not-a-uuid",
			});
			expect(result.success).toBe(false);
		});
	});

	describe("ticketUpdateInputSchema", () => {
		test("accepts valid update input", () => {
			const result = ticketUpdateInputSchema.safeParse({
				id: 1,
				patches: [{ op: "replace", path: "/Title", value: "New Title" }],
			});
			expect(result.success).toBe(true);
		});

		test("rejects empty patches array", () => {
			const result = ticketUpdateInputSchema.safeParse({
				id: 1,
				patches: [],
			});
			expect(result.success).toBe(false);
		});

		test("rejects invalid op", () => {
			const result = ticketUpdateInputSchema.safeParse({
				id: 1,
				patches: [{ op: "invalid", path: "/Title" }],
			});
			expect(result.success).toBe(false);
		});
	});

	describe("ticketFeedPostInputSchema", () => {
		test("accepts valid feed post", () => {
			const result = ticketFeedPostInputSchema.safeParse({
				id: 1,
				Comments: "Hello",
			});
			expect(result.success).toBe(true);
		});

		test("rejects empty Comments", () => {
			const result = ticketFeedPostInputSchema.safeParse({
				id: 1,
				Comments: "",
			});
			expect(result.success).toBe(false);
		});

		test("rejects missing Comments", () => {
			const result = ticketFeedPostInputSchema.safeParse({ id: 1 });
			expect(result.success).toBe(false);
		});
	});
});
