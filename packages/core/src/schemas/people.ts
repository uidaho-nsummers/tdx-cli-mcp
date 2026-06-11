import { z } from "zod";

export const peopleSearchInputSchema = z.object({
	SearchText: z.string().max(500).optional().describe("Full-text search query"),
	IsActive: z.boolean().optional().describe("Filter by active status"),
	MaxResults: z
		.number()
		.int()
		.min(1)
		.optional()
		.default(25)
		.describe("Maximum number of results to return"),
});

export const peopleGetInputSchema = z.object({
	uid: z.string().uuid().describe("Person UID (GUID)"),
});
