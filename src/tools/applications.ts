import type { CallToolResult } from "@modelcontextprotocol/server";
import { tdxRequest } from "@tdx/core";
import { textResult } from "./utils.js";

export async function applicationsList(): Promise<CallToolResult> {
	const { data } = await tdxRequest({
		path: "/applications",
	});
	return textResult(data);
}
