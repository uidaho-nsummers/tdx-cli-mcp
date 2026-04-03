import type { CallToolResult } from "@modelcontextprotocol/server";
import { tdxRequest } from "../api/client.js";
import { textResult } from "./utils.js";

export async function applicationsList(): Promise<CallToolResult> {
	const { data } = await tdxRequest({
		path: "/applications",
	});
	return textResult(data);
}
