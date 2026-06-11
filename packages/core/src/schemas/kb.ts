import { z } from "zod";

export const kbSearchInputSchema = z.object({
	SearchText: z.string().max(500).optional().describe("Full-text search query"),
	CategoryIDs: z
		.array(z.number().int())
		.optional()
		.describe("Filter by category IDs"),
	ReturnCount: z
		.number()
		.int()
		.min(1)
		.optional()
		.default(25)
		.describe("Maximum number of results to return"),
});

export const kbGetInputSchema = z.object({
	id: z.number().int().positive().describe("Knowledge Base article ID"),
});
