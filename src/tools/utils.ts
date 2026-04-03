import type { CallToolResult } from "@modelcontextprotocol/server";
import { TdxApiError } from "../api/client.js";

export function textResult(data: unknown): CallToolResult {
	return {
		content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
	};
}

export async function safeToolCall(
	fn: () => Promise<CallToolResult>,
): Promise<CallToolResult> {
	try {
		return await fn();
	} catch (error) {
		if (error instanceof TdxApiError) {
			return {
				content: [
					{
						type: "text",
						text: `TDX API error: ${error.status} ${error.statusText}`,
					},
				],
				isError: true,
			};
		}
		return {
			content: [{ type: "text", text: "An unexpected error occurred" }],
			isError: true,
		};
	}
}
