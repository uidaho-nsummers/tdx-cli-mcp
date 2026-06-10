import type { CallToolResult } from "@modelcontextprotocol/server";
import { tdxRequest } from "@tdx/core";
import type { z } from "zod";
import type {
	peopleGetInputSchema,
	peopleSearchInputSchema,
} from "./schemas/people.js";
import { textResult } from "./utils.js";

export async function peopleSearch(
	args: z.infer<typeof peopleSearchInputSchema>,
): Promise<CallToolResult> {
	const { data } = await tdxRequest({
		method: "POST",
		path: "/people/search",
		body: args,
	});
	return textResult(data);
}

export async function peopleGet(
	args: z.infer<typeof peopleGetInputSchema>,
): Promise<CallToolResult> {
	const { data } = await tdxRequest({
		path: `/people/${args.uid}`,
	});
	return textResult(data);
}
