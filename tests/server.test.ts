import { describe, expect, test, vi } from "vitest";

// Mock config - must be before any imports that trigger config loading
vi.mock("../src/config.ts", () => ({
	getConfig: () => ({
		TDX_BASE_URL: "https://tdx.example.com/TDWebApi/api",
		TDX_BEID: "test-beid",
		TDX_WEB_SERVICES_KEY: "test-key",
		TDX_TICKETING_APP_ID: 42,
		TDX_ASSET_APP_ID: 10,
		TDX_KB_APP_ID: 20,
	}),
}));

// Mock the API client and auth
vi.mock("../src/api/client.ts", () => ({
	tdxRequest: vi.fn(() =>
		Promise.resolve({ data: {}, headers: new Headers() }),
	),
	TdxApiError: class TdxApiError extends Error {
		constructor(
			public status: number,
			public statusText: string,
			public body: string,
		) {
			super(`TDX API error ${status}: ${statusText}`);
		}
	},
}));

vi.mock("../src/auth/client.ts", () => ({
	getAuthToken: vi.fn(() => Promise.resolve("mock-token")),
}));

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
