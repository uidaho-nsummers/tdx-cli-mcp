import type { z } from "zod";
import { tdxRequest } from "../api/client.js";
import { getConfig } from "../config.js";
import type { kbGetInputSchema, kbSearchInputSchema } from "../schemas/kb.js";

const appId = () => getConfig().TDX_KB_APP_ID;

export async function kbSearch(
	args: z.infer<typeof kbSearchInputSchema>,
): Promise<unknown> {
	const { data } = await tdxRequest({
		method: "POST",
		path: `/${appId()}/knowledgebase/search`,
		body: args,
	});
	return data;
}

export async function kbGet(
	args: z.infer<typeof kbGetInputSchema>,
): Promise<unknown> {
	const { data } = await tdxRequest({
		path: `/${appId()}/knowledgebase/${args.id}`,
	});
	return data;
}
