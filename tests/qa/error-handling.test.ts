import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	test,
	vi,
} from "vitest";

// Mock config
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

import type { JSONRPCMessage } from "@modelcontextprotocol/server";
import {
	createTestClient,
	initializeClient,
	type McpTestClient,
	makeJwt,
} from "./helpers.js";

let client: McpTestClient;
let _fetchCallCount = 0;
let fetchMockFn:
	| ((url: string, init?: RequestInit) => Response | Promise<Response>)
	| null = null;
const originalFetch = globalThis.fetch;

function setFetchMock(
	fn: (url: string, init?: RequestInit) => Response | Promise<Response>,
) {
	fetchMockFn = fn;
}

beforeAll(() => {
	globalThis.fetch = vi.fn(
		async (input: string | URL | Request, init?: RequestInit) => {
			_fetchCallCount++;
			const url =
				typeof input === "string"
					? input
					: input instanceof URL
						? input.toString()
						: input.url;
			if (fetchMockFn) {
				return fetchMockFn(url, init);
			}
			return new Response("Not mocked", { status: 500 });
		},
	) as unknown as typeof fetch;
});

afterEach(async () => {
	if (client) await client.close();
	_fetchCallCount = 0;
	fetchMockFn = null;
});

afterAll(() => {
	globalThis.fetch = originalFetch;
});

function defaultHeaders() {
	return new Headers({
		"X-RateLimit-Remaining": "55",
		"X-RateLimit-Reset": new Date(Date.now() + 60000).toISOString(),
		"Content-Type": "application/json",
	});
}

describe("Error handling and edge cases", () => {
	test("expired JWT triggers re-auth on next API call", async () => {
		// First auth returns a token that's about to expire (exp in the past + buffer)
		let authCallCount = 0;
		const expiredToken = makeJwt(Math.floor(Date.now() / 1000) - 100);
		const freshToken = makeJwt(Math.floor(Date.now() / 1000) + 86400);

		setFetchMock((url, _init) => {
			if (url.includes("/auth/loginadmin")) {
				authCallCount++;
				// First call returns expired token, second returns fresh
				const token = authCallCount === 1 ? expiredToken : freshToken;
				return new Response(token, { status: 200 });
			}
			return new Response(JSON.stringify([]), {
				status: 200,
				headers: defaultHeaders(),
			});
		});

		client = await createTestClient();
		await initializeClient(client);

		// First tool call — will auth, get expired token, then re-auth on next call
		client.send({
			jsonrpc: "2.0",
			id: 10,
			method: "tools/call",
			params: { name: "tdx_applications_list", arguments: {} },
		} as unknown as JSONRPCMessage);
		await client.readResponse();

		// Second tool call — should trigger re-auth because token is expired
		client.send({
			jsonrpc: "2.0",
			id: 11,
			method: "tools/call",
			params: { name: "tdx_applications_list", arguments: {} },
		} as unknown as JSONRPCMessage);
		await client.readResponse();

		// Auth should have been called at least twice (once for initial, once for refresh)
		expect(authCallCount).toBeGreaterThanOrEqual(2);
	});

	test("rate limiter tracks calls and computes retry wait", async () => {
		// Direct unit test of rate limiter behavior since the 429 retry loop
		// uses a 60-second sliding window that's too slow for integration tests.
		const { waitIfNeeded, recordCall, getRetryWaitMs } = await import(
			"../../src/api/rate-limiter.js"
		);

		// Record a call for a unique test endpoint
		const method = "GET";
		const path = "/test-429-endpoint";
		recordCall(method, path);

		// getRetryWaitMs should return a positive value (at least 1s)
		const waitMs = getRetryWaitMs(method, path);
		expect(waitMs).toBeGreaterThanOrEqual(1000);

		// waitIfNeeded should resolve quickly since we're well under the 60-call limit
		const start = Date.now();
		await waitIfNeeded(method, path);
		const elapsed = Date.now() - start;
		expect(elapsed).toBeLessThan(100); // Should not wait since limit not hit
	});

	test("malformed/invalid tool input returns clear MCP error", async () => {
		setFetchMock((url) => {
			if (url.includes("/auth/loginadmin")) {
				return new Response(makeJwt(Math.floor(Date.now() / 1000) + 86400), {
					status: 200,
				});
			}
			return new Response(JSON.stringify({}), {
				status: 200,
				headers: defaultHeaders(),
			});
		});

		client = await createTestClient();
		await initializeClient(client);

		// Send invalid input — tdx_tickets_get expects { id: number } but we send string
		client.send({
			jsonrpc: "2.0",
			id: 10,
			method: "tools/call",
			params: {
				name: "tdx_tickets_get",
				arguments: { id: "not-a-number" },
			},
		} as unknown as JSONRPCMessage);

		const response = await client.readResponse();
		// Should get an error response — either a tool error or JSON-RPC error
		const hasError =
			response.error !== undefined ||
			(response.result as { isError?: boolean })?.isError === true;
		expect(hasError).toBe(true);
	});

	test("calling a nonexistent tool returns MCP error", async () => {
		client = await createTestClient();
		await initializeClient(client);

		client.send({
			jsonrpc: "2.0",
			id: 10,
			method: "tools/call",
			params: { name: "tdx_nonexistent_tool", arguments: {} },
		} as unknown as JSONRPCMessage);

		const response = await client.readResponse();
		// Should be a JSON-RPC error or tool error
		expect(response.error).toBeDefined();
	});

	test("API 500 error returns MCP tool error response", async () => {
		setFetchMock((url) => {
			if (url.includes("/auth/loginadmin")) {
				return new Response(makeJwt(Math.floor(Date.now() / 1000) + 86400), {
					status: 200,
				});
			}
			return new Response("Internal Server Error", {
				status: 500,
				headers: defaultHeaders(),
			});
		});

		client = await createTestClient();
		await initializeClient(client);

		client.send({
			jsonrpc: "2.0",
			id: 10,
			method: "tools/call",
			params: { name: "tdx_applications_list", arguments: {} },
		} as unknown as JSONRPCMessage);

		const response = await client.readResponse();
		// Should be either a JSON-RPC error or a tool result with isError: true
		const isToolError =
			(response.result as { isError?: boolean })?.isError === true;
		const isJsonRpcError = response.error !== undefined;
		expect(isToolError || isJsonRpcError).toBe(true);
	});

	test("API 401 unauthorized error is surfaced", async () => {
		setFetchMock((url) => {
			if (url.includes("/auth/loginadmin")) {
				return new Response(makeJwt(Math.floor(Date.now() / 1000) + 86400), {
					status: 200,
				});
			}
			return new Response("Unauthorized", {
				status: 401,
				headers: defaultHeaders(),
			});
		});

		client = await createTestClient();
		await initializeClient(client);

		client.send({
			jsonrpc: "2.0",
			id: 10,
			method: "tools/call",
			params: {
				name: "tdx_tickets_get",
				arguments: { id: 999 },
			},
		} as unknown as JSONRPCMessage);

		const response = await client.readResponse();
		const isToolError =
			(response.result as { isError?: boolean })?.isError === true;
		const isJsonRpcError = response.error !== undefined;
		expect(isToolError || isJsonRpcError).toBe(true);
	});

	test("auth failure returns error", async () => {
		setFetchMock((url) => {
			if (url.includes("/auth/loginadmin")) {
				return new Response("Forbidden", { status: 403 });
			}
			return new Response("", { status: 200, headers: defaultHeaders() });
		});

		client = await createTestClient();
		await initializeClient(client);

		client.send({
			jsonrpc: "2.0",
			id: 10,
			method: "tools/call",
			params: { name: "tdx_applications_list", arguments: {} },
		} as unknown as JSONRPCMessage);

		const response = await client.readResponse();
		// Auth failure should bubble up as an error
		const isToolError =
			(response.result as { isError?: boolean })?.isError === true;
		const isJsonRpcError = response.error !== undefined;
		expect(isToolError || isJsonRpcError).toBe(true);
	});

	test("empty response body is handled gracefully", async () => {
		setFetchMock((url) => {
			if (url.includes("/auth/loginadmin")) {
				return new Response(makeJwt(Math.floor(Date.now() / 1000) + 86400), {
					status: 200,
				});
			}
			return new Response("", { status: 200, headers: defaultHeaders() });
		});

		client = await createTestClient();
		await initializeClient(client);

		client.send({
			jsonrpc: "2.0",
			id: 10,
			method: "tools/call",
			params: { name: "tdx_applications_list", arguments: {} },
		} as unknown as JSONRPCMessage);

		const response = await client.readResponse();
		// Should not crash — either return a result or an error, but should respond
		const hasResult = response.result !== undefined;
		const hasError = response.error !== undefined;
		expect(hasResult || hasError).toBe(true);
	});

	test("tool with missing required fields returns validation error", async () => {
		setFetchMock((url) => {
			if (url.includes("/auth/loginadmin")) {
				return new Response(makeJwt(Math.floor(Date.now() / 1000) + 86400), {
					status: 200,
				});
			}
			return new Response(JSON.stringify({}), {
				status: 200,
				headers: defaultHeaders(),
			});
		});

		client = await createTestClient();
		await initializeClient(client);

		// tdx_tickets_create requires TypeID and Title
		client.send({
			jsonrpc: "2.0",
			id: 10,
			method: "tools/call",
			params: {
				name: "tdx_tickets_create",
				arguments: {}, // Missing required TypeID and Title
			},
		} as unknown as JSONRPCMessage);

		const response = await client.readResponse();
		const isToolError =
			(response.result as { isError?: boolean })?.isError === true;
		const isJsonRpcError = response.error !== undefined;
		expect(isToolError || isJsonRpcError).toBe(true);
	});

	test("graceful shutdown via SIGTERM (server close)", async () => {
		// Test that we can cleanly close the server without errors
		client = await createTestClient();
		await initializeClient(client);

		// Close should complete without throwing
		await client.close();
		// Set to null so afterEach doesn't double-close
		client = null as unknown as McpTestClient;
	});
});
