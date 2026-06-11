import type { z } from "zod";
import { tdxRequest } from "../api/client.js";
import { getConfig } from "../config.js";
import {
	assetGetInputSchema,
	assetSearchInputSchema,
} from "../schemas/assets.js";

const appId = () => getConfig().TDX_ASSET_APP_ID;

export async function assetsSearch(
	args: z.input<typeof assetSearchInputSchema>,
): Promise<unknown> {
	const input = assetSearchInputSchema.parse(args);
	const { data } = await tdxRequest({
		method: "POST",
		path: `/${appId()}/assets/search`,
		body: input,
	});
	return data;
}

export async function assetsGet(
	args: z.input<typeof assetGetInputSchema>,
): Promise<unknown> {
	const input = assetGetInputSchema.parse(args);
	const { data } = await tdxRequest({
		path: `/${appId()}/assets/${input.id}`,
	});
	return data;
}
