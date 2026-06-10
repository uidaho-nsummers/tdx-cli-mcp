import { afterEach, describe, expect, test, vi } from "vitest";

// Mock config before any transitive imports
vi.mock("../../src/config.ts", () => ({
	getConfig: () => ({
		TDX_BASE_URL: "https://tdx.example.com/TDWebApi/api",
		TDX_BEID: "test-beid",
		TDX_WEB_SERVICES_KEY: "test-key",
		TDX_TICKETING_APP_ID: 42,
		TDX_ASSET_APP_ID: 10,
		TDX_KB_APP_ID: 20,
	}),
}));

import {
	createTestClient,
	initializeClient,
	type McpTestClient,
} from "./helpers.js";

let client: McpTestClient;

afterEach(async () => {
	if (client) await client.close();
});

describe("MCP server startup and initialize handshake", () => {
	test("responds to initialize with correct protocol version and server info", async () => {
		client = await createTestClient();
		const response = await initializeClient(client);

		expect(response).toHaveProperty("jsonrpc", "2.0");
		expect(response).toHaveProperty("id", 1);

		const result = response.result as Record<string, unknown>;
		expect(result).toBeDefined();
		expect(result.protocolVersion).toBeString();
		expect(result.serverInfo).toEqual({
			name: "tdx-mcp-server",
			version: "0.1.0",
		});
	});

	test("returns capabilities including tools", async () => {
		client = await createTestClient();
		const response = await initializeClient(client);
		const result = response.result as Record<string, unknown>;

		expect(result.capabilities).toBeDefined();
		const capabilities = result.capabilities as Record<string, unknown>;
		expect(capabilities.tools).toBeDefined();
	});

	test("lists all 13 registered tools with correct names", async () => {
		client = await createTestClient();
		await initializeClient(client);

		client.send({
			jsonrpc: "2.0",
			id: 2,
			method: "tools/list",
		});

		const response = await client.readResponse();
		const result = response.result as {
			tools: Array<{ name: string; description: string; inputSchema: unknown }>;
		};

		expect(result.tools).toBeArray();
		expect(result.tools.length).toBe(13);

		const toolNames = result.tools.map((t) => t.name).sort();
		const expectedTools = [
			"tdx_applications_list",
			"tdx_assets_get",
			"tdx_assets_search",
			"tdx_kb_get",
			"tdx_kb_search",
			"tdx_people_get",
			"tdx_people_search",
			"tdx_tickets_create",
			"tdx_tickets_feed_get",
			"tdx_tickets_feed_post",
			"tdx_tickets_get",
			"tdx_tickets_search",
			"tdx_tickets_update",
		].sort();

		expect(toolNames).toEqual(expectedTools);
	});

	test("each tool has a description and inputSchema with type object", async () => {
		client = await createTestClient();
		await initializeClient(client);

		client.send({
			jsonrpc: "2.0",
			id: 3,
			method: "tools/list",
		});

		const response = await client.readResponse();
		const result = response.result as {
			tools: Array<{ name: string; description: string; inputSchema: unknown }>;
		};

		for (const tool of result.tools) {
			expect(tool.name).toBeString();
			expect(tool.description).toBeString();
			expect(tool.description.length).toBeGreaterThan(0);
			expect(tool.inputSchema).toBeDefined();
			expect(typeof tool.inputSchema).toBe("object");

			// MCP spec requires inputSchema to have type: "object"
			const schema = tool.inputSchema as Record<string, unknown>;
			expect(schema.type).toBe("object");
		}
	});

	test("handles unknown method with JSON-RPC method-not-found error", async () => {
		client = await createTestClient();
		await initializeClient(client);

		client.send({
			jsonrpc: "2.0",
			id: 4,
			method: "nonexistent/method",
		});

		const response = await client.readResponse();
		expect(response).toHaveProperty("error");
		const error = response.error as { code: number; message: string };
		// JSON-RPC method not found code
		expect(error.code).toBe(-32601);
	});

	test("all responses include jsonrpc 2.0 version", async () => {
		client = await createTestClient();
		const initResponse = await initializeClient(client);
		expect(initResponse.jsonrpc).toBe("2.0");

		client.send({
			jsonrpc: "2.0",
			id: 5,
			method: "tools/list",
		});

		const toolsResponse = await client.readResponse();
		expect(toolsResponse.jsonrpc).toBe("2.0");
	});
});
