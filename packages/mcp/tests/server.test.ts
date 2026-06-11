import { describe, expect, test, vi } from "vitest";

// Partial mock of core - keep real operations and schemas, stub the runtime
// dependencies (config, API client, auth) so the server can register tools
// without loading real config or hitting the network.
vi.mock("@tdx/core", async () => {
	const actual = await vi.importActual<typeof import("@tdx/core")>("@tdx/core");
	return {
		...actual,
		getConfig: () => ({
			TDX_BASE_URL: "https://tdx.example.com/TDWebApi/api",
			TDX_BEID: "test-beid",
			TDX_WEB_SERVICES_KEY: "test-key",
			TDX_TICKETING_APP_ID: 42,
			TDX_ASSET_APP_ID: 10,
			TDX_KB_APP_ID: 20,
		}),
		tdxRequest: vi.fn(() =>
			Promise.resolve({ data: {}, headers: new Headers() }),
		),
		getAuthToken: vi.fn(() => Promise.resolve("mock-token")),
		clearAuthToken: vi.fn(),
	};
});

describe("MCP server integration", () => {
	describe("tool listing", () => {
		test("createServer returns an McpServer instance", async () => {
			const { createServer } = await import("../src/server.ts");
			const server = createServer();
			expect(server).toBeDefined();
		});

		test("can create multiple servers independently", async () => {
			const { createServer } = await import("../src/server.ts");
			const server1 = createServer();
			const server2 = createServer();
			expect(server1).not.toBe(server2);
		});
	});

	describe("server creation", () => {
		test("registers tools without throwing", async () => {
			const { createServer } = await import("../src/server.ts");
			expect(() => createServer()).not.toThrow();
		});
	});
});
