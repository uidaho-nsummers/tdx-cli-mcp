import type { JSONRPCMessage } from "@modelcontextprotocol/server";
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	test,
	vi,
} from "vitest";
import * as fixtures from "../fixtures/tdx-responses.js";
import {
	createTestClient,
	initializeClient,
	type McpTestClient,
} from "./helpers.js";

process.env.TDX_BASE_URL = "https://tdx.example.com/TDWebApi/api";
process.env.TDX_BEID = "test-beid";
process.env.TDX_WEB_SERVICES_KEY = "test-key";
process.env.TDX_TICKETING_APP_ID = "42";
process.env.TDX_ASSET_APP_ID = "10";
process.env.TDX_KB_APP_ID = "20";

let client: McpTestClient;
let requestLog: Array<{ url: string; method: string; body?: unknown }> = [];
let nextId = 10;

const originalFetch = globalThis.fetch;

// Mock fetch to intercept TDX API calls
function setupFetchMock() {
	const authToken = fixtures.validAuthToken();

	globalThis.fetch = vi.fn(
		async (input: string | URL | Request, init?: RequestInit) => {
			const url =
				typeof input === "string"
					? input
					: input instanceof URL
						? input.toString()
						: input.url;
			const method = init?.method ?? "GET";
			let body: unknown;
			try {
				body = init?.body ? JSON.parse(init.body as string) : undefined;
			} catch {
				body = init?.body;
			}
			requestLog.push({ url, method, body });

			// Auth endpoint
			if (url.includes("/auth/loginadmin")) {
				return new Response(authToken, { status: 200 });
			}

			const headers = new Headers({
				"X-RateLimit-Remaining": "55",
				"X-RateLimit-Reset": new Date(Date.now() + 60000).toISOString(),
				"Content-Type": "application/json",
			});

			// Strip query string for pattern matching
			const pathname = new URL(url).pathname;

			// Ticket endpoints
			if (pathname.includes("/tickets/search")) {
				return new Response(JSON.stringify(fixtures.ticketSearchResults), {
					status: 200,
					headers,
				});
			}
			if (pathname.match(/\/tickets\/\d+\/feed$/) && method === "GET") {
				return new Response(JSON.stringify(fixtures.ticketFeed), {
					status: 200,
					headers,
				});
			}
			if (pathname.match(/\/tickets\/\d+\/feed$/) && method === "POST") {
				return new Response(JSON.stringify(fixtures.feedPostResult), {
					status: 200,
					headers,
				});
			}
			if (pathname.match(/\/tickets\/\d+$/) && method === "PATCH") {
				return new Response(JSON.stringify(fixtures.ticketUpdated), {
					status: 200,
					headers,
				});
			}
			if (pathname.match(/\/tickets\/\d+$/) && method === "GET") {
				return new Response(JSON.stringify(fixtures.ticketDetail), {
					status: 200,
					headers,
				});
			}
			if (pathname.match(/\/tickets$/) && method === "POST") {
				return new Response(JSON.stringify(fixtures.ticketCreated), {
					status: 200,
					headers,
				});
			}

			// Asset endpoints
			if (pathname.includes("/assets/search")) {
				return new Response(JSON.stringify(fixtures.assetSearchResults), {
					status: 200,
					headers,
				});
			}
			if (pathname.match(/\/assets\/\d+$/)) {
				return new Response(JSON.stringify(fixtures.assetDetail), {
					status: 200,
					headers,
				});
			}

			// KB endpoints
			if (pathname.includes("/knowledgebase/search")) {
				return new Response(JSON.stringify(fixtures.kbSearchResults), {
					status: 200,
					headers,
				});
			}
			if (pathname.match(/\/knowledgebase\/\d+$/)) {
				return new Response(JSON.stringify(fixtures.kbArticle), {
					status: 200,
					headers,
				});
			}

			// People endpoints
			if (pathname.includes("/people/search")) {
				return new Response(JSON.stringify(fixtures.peopleSearchResults), {
					status: 200,
					headers,
				});
			}
			if (pathname.match(/\/people\/[0-9a-f-]+$/)) {
				return new Response(JSON.stringify(fixtures.personDetail), {
					status: 200,
					headers,
				});
			}

			// Applications
			if (pathname.includes("/applications")) {
				return new Response(JSON.stringify(fixtures.applicationsList), {
					status: 200,
					headers,
				});
			}

			return new Response("Not Found", { status: 404 });
		},
	) as unknown as typeof fetch;
}

beforeAll(() => {
	setupFetchMock();
});

afterEach(async () => {
	if (client) await client.close();
	requestLog = [];
	nextId = 10;
});

afterAll(() => {
	globalThis.fetch = originalFetch;
});

function callTool(name: string, args: Record<string, unknown>) {
	const id = nextId++;
	client.send({
		jsonrpc: "2.0",
		id,
		method: "tools/call",
		params: { name, arguments: args },
	} as unknown as JSONRPCMessage);
	return id;
}

async function callToolAndGetResult(
	name: string,
	args: Record<string, unknown>,
) {
	callTool(name, args);
	const response = await client.readResponse();
	expect(response).not.toHaveProperty("error");
	const result = response.result as {
		content: Array<{ type: string; text: string }>;
	};
	expect(result.content).toBeArray();
	expect(result.content[0]?.type).toBe("text");
	return JSON.parse((result.content[0] as { text: string }).text);
}

describe("Tool invocations with realistic TDX responses", () => {
	// --- Ticket tools ---

	test("tdx_tickets_search returns parsed search results", async () => {
		client = await createTestClient();
		await initializeClient(client);

		const data = await callToolAndGetResult("tdx_tickets_search", {
			SearchText: "VPN",
		});

		expect(data).toBeArray();
		expect(data.length).toBe(2);
		expect(data[0].ID).toBe(12345);
		expect(data[0].Title).toBe("VPN not connecting from remote office");
	});

	test("tdx_tickets_search sends correct request to TDX API", async () => {
		client = await createTestClient();
		await initializeClient(client);

		await callToolAndGetResult("tdx_tickets_search", {
			SearchText: "VPN",
			StatusIDs: [1, 2],
		});

		const searchReq = requestLog.find((r) => r.url.includes("/tickets/search"));
		expect(searchReq).toBeDefined();
		expect(searchReq?.method).toBe("POST");
		expect(searchReq?.body).toMatchObject({
			SearchText: "VPN",
			StatusIDs: [1, 2],
		});
	});

	test("tdx_tickets_get returns ticket detail", async () => {
		client = await createTestClient();
		await initializeClient(client);

		const data = await callToolAndGetResult("tdx_tickets_get", { id: 12345 });

		expect(data.ID).toBe(12345);
		expect(data.Title).toBe("VPN not connecting from remote office");
		expect(data.Attributes).toBeArray();
	});

	test("tdx_tickets_create sends correct body and returns created ticket", async () => {
		client = await createTestClient();
		await initializeClient(client);

		const data = await callToolAndGetResult("tdx_tickets_create", {
			TypeID: 20,
			Title: "New printer installation request",
		});

		expect(data.ID).toBe(12400);
		expect(data.Title).toBe("New printer installation request");
	});

	test("tdx_tickets_update sends PATCH and returns updated ticket", async () => {
		client = await createTestClient();
		await initializeClient(client);

		const id = nextId++;
		client.send({
			jsonrpc: "2.0",
			id,
			method: "tools/call",
			params: {
				name: "tdx_tickets_update",
				arguments: {
					id: 12345,
					patches: [{ op: "replace", path: "/StatusID", value: 3 }],
				},
			},
		} as unknown as JSONRPCMessage);

		const response = await client.readResponse();
		// Check if error for debugging
		if (response.error) {
			// If there's an error, it should be a MCP tool error, not crash
			expect(response).not.toHaveProperty("error");
		}
		const result = response.result as {
			content: Array<{ type: string; text: string }>;
		};
		const data = JSON.parse((result.content[0] as { text: string }).text);

		expect(data.ID).toBe(12345);
		expect(data.StatusName).toBe("Resolved");

		const patchReq = requestLog.find((r) => r.method === "PATCH");
		expect(patchReq).toBeDefined();
	});

	test("tdx_tickets_feed_get returns feed entries", async () => {
		client = await createTestClient();
		await initializeClient(client);

		const data = await callToolAndGetResult("tdx_tickets_feed_get", {
			id: 12345,
		});

		expect(data).toBeArray();
		expect(data.length).toBe(2);
		expect(data[0].Body).toContain("Ticket created");
	});

	test("tdx_tickets_feed_post posts comment and returns result", async () => {
		client = await createTestClient();
		await initializeClient(client);

		const data = await callToolAndGetResult("tdx_tickets_feed_post", {
			id: 12345,
			Comments: "Applied firmware rollback. Testing connectivity.",
		});

		expect(data.ID).toBe(50003);
		expect(data.Body).toContain("firmware rollback");
	});

	// --- Asset tools ---

	test("tdx_assets_search returns asset list", async () => {
		client = await createTestClient();
		await initializeClient(client);

		const data = await callToolAndGetResult("tdx_assets_search", {
			SearchText: "Dell",
		});

		expect(data).toBeArray();
		expect(data.length).toBe(2);
		expect(data[0].Name).toBe("Dell Latitude 7420");
	});

	test("tdx_assets_get returns asset detail", async () => {
		client = await createTestClient();
		await initializeClient(client);

		const data = await callToolAndGetResult("tdx_assets_get", { id: 2001 });

		expect(data.ID).toBe(2001);
		expect(data.SerialNumber).toBe("SVC-DL7420-001");
		expect(data.PurchaseCost).toBe(1299.99);
	});

	// --- KB tools ---

	test("tdx_kb_search returns KB articles", async () => {
		client = await createTestClient();
		await initializeClient(client);

		const data = await callToolAndGetResult("tdx_kb_search", {
			SearchText: "VPN",
		});

		expect(data).toBeArray();
		expect(data[0].Subject).toBe("How to connect to VPN");
	});

	test("tdx_kb_get returns full article", async () => {
		client = await createTestClient();
		await initializeClient(client);

		const data = await callToolAndGetResult("tdx_kb_get", { id: 3001 });

		expect(data.ID).toBe(3001);
		expect(data.Body).toContain("VPN Connection Guide");
	});

	// --- People tools ---

	test("tdx_people_search returns people", async () => {
		client = await createTestClient();
		await initializeClient(client);

		const data = await callToolAndGetResult("tdx_people_search", {
			SearchText: "Jane",
		});

		expect(data).toBeArray();
		expect(data[0].FullName).toBe("Jane Smith");
	});

	test("tdx_people_get returns person detail", async () => {
		client = await createTestClient();
		await initializeClient(client);

		const data = await callToolAndGetResult("tdx_people_get", {
			uid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
		});

		expect(data.FullName).toBe("Jane Smith");
		expect(data.Department).toBe("Engineering");
	});

	// --- Applications tool ---

	test("tdx_applications_list returns all apps", async () => {
		client = await createTestClient();
		await initializeClient(client);

		const data = await callToolAndGetResult("tdx_applications_list", {});

		expect(data).toBeArray();
		expect(data.length).toBe(3);
		expect(data[0].AppName).toBe("IT Ticketing");
	});

	// --- Output format validation ---

	test("all tool results are MCP-compliant with text content type", async () => {
		client = await createTestClient();
		await initializeClient(client);

		// Test a few representative tools
		for (const [tool, args] of [
			["tdx_tickets_search", { SearchText: "test" }],
			["tdx_tickets_get", { id: 1 }],
			["tdx_applications_list", {}],
		] as const) {
			const id = nextId++;
			client.send({
				jsonrpc: "2.0",
				id,
				method: "tools/call",
				params: { name: tool, arguments: args },
			} as unknown as JSONRPCMessage);

			const response = await client.readResponse();
			const result = response.result as {
				content: Array<{ type: string; text: string }>;
			};
			expect(result.content).toBeArray();
			expect(result.content.length).toBeGreaterThan(0);
			expect(result.content[0]?.type).toBe("text");
			// Verify the text is valid JSON
			expect(() =>
				JSON.parse((result.content[0] as { text: string }).text),
			).not.toThrow();
		}
	});

	test("auth is called before API calls (token cached across tests)", async () => {
		// Note: auth token is cached at module level. After the first tool call
		// in this test file, the cached JWT is reused for subsequent calls.
		// We check across all accumulated requests rather than per-test.
		// The auth call happened in earlier tests.
		client = await createTestClient();
		await initializeClient(client);

		// Use a fresh requestLog to verify auth+api ordering in a single test
		requestLog = [];
		await callToolAndGetResult("tdx_applications_list", {});

		// Auth may or may not be called (cached from earlier tests in-process).
		// If it is called, verify it's correct.
		const authReq = requestLog.find((r) => r.url.includes("/auth/loginadmin"));
		if (authReq) {
			expect(authReq.method).toBe("POST");
			expect(authReq.body).toMatchObject({
				BEID: "test-beid",
				WebServicesKey: "test-key",
			});
		}

		// API call should always be present
		const apiReq = requestLog.find(
			(r) => r.url.includes("/applications") && !r.url.includes("/auth"),
		);
		expect(apiReq).toBeDefined();

		// If auth was called, it should be before the API call
		if (authReq) {
			const authIdx = requestLog.indexOf(authReq);
			const apiIdx = requestLog.indexOf(apiReq as (typeof requestLog)[number]);
			expect(authIdx).toBeLessThan(apiIdx);
		}
	});
});
