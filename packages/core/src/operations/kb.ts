import type { z } from "zod";
import { tdxRequest } from "../api/client.js";
import { getConfig } from "../config.js";
import { kbGetInputSchema, kbSearchInputSchema } from "../schemas/kb.js";

const appId = () => getConfig().TDX_KB_APP_ID;

export async function kbSearch(
	args: z.input<typeof kbSearchInputSchema>,
): Promise<unknown> {
	const input = kbSearchInputSchema.parse(args);
	const { data } = await tdxRequest({
		method: "POST",
		path: `/${appId()}/knowledgebase/search`,
		body: input,
	});
	return data;
}

export async function kbGet(
	args: z.input<typeof kbGetInputSchema>,
): Promise<unknown> {
	const input = kbGetInputSchema.parse(args);
	const { data } = await tdxRequest({
		path: `/${appId()}/knowledgebase/${input.id}`,
	});
	return data;
}
