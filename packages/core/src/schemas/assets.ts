import { z } from "zod";

export const assetSearchInputSchema = z.object({
	SearchText: z.string().max(500).optional().describe("Full-text search query"),
	StatusIDs: z
		.array(z.number().int())
		.optional()
		.describe("Filter by status IDs"),
	MaxResults: z
		.number()
		.int()
		.min(1)
		.optional()
		.default(25)
		.describe("Maximum number of results to return"),
});

export const assetGetInputSchema = z.object({
	id: z.number().int().positive().describe("Asset ID"),
});
