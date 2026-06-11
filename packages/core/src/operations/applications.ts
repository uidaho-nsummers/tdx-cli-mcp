import { tdxRequest } from "../api/client.js";

export async function applicationsList(): Promise<unknown> {
	const { data } = await tdxRequest({
		path: "/applications",
	});
	return data;
}
