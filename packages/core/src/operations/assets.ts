import type { z } from "zod";
import { tdxRequest } from "../api/client.js";
import { getConfig } from "../config.js";
import type {
	assetGetInputSchema,
	assetSearchInputSchema,
} from "../schemas/assets.js";

const appId = () => getConfig().TDX_ASSET_APP_ID;

export async function assetsSearch(
	args: z.infer<typeof assetSearchInputSchema>,
): Promise<unknown> {
	const { data } = await tdxRequest({
		method: "POST",
		path: `/${appId()}/assets/search`,
		body: args,
	});
	return data;
}

export async function assetsGet(
	args: z.infer<typeof assetGetInputSchema>,
): Promise<unknown> {
	const { data } = await tdxRequest({
		path: `/${appId()}/assets/${args.id}`,
	});
	return data;
}
