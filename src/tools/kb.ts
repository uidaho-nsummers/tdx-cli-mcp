import type { CallToolResult } from "@modelcontextprotocol/server";
import type { z } from "zod";
import { tdxRequest } from "../api/client.js";
import { getConfig } from "../config.js";
import type { kbGetInputSchema, kbSearchInputSchema } from "./schemas/kb.js";
import { textResult } from "./utils.js";

const appId = () => getConfig().TDX_KB_APP_ID;

export async function kbSearch(
	args: z.infer<typeof kbSearchInputSchema>,
): Promise<CallToolResult> {
	const { data } = await tdxRequest({
		method: "POST",
		path: `/${appId()}/knowledgebase/search`,
		body: args,
	});
	return textResult(data);
}

export async function kbGet(
	args: z.infer<typeof kbGetInputSchema>,
): Promise<CallToolResult> {
	const { data } = await tdxRequest({
		path: `/${appId()}/knowledgebase/${args.id}`,
	});
	return textResult(data);
}
