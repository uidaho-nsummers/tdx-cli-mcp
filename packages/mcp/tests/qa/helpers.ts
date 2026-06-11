/**
 * Test helpers for QA tests.
 * Uses a custom in-memory Transport to talk to the MCP server directly in-process.
 */

import {
	type JSONRPCMessage,
	LATEST_PROTOCOL_VERSION,
	type Transport,
} from "@modelcontextprotocol/server";
import { createServer } from "../../src/server.js";

export { LATEST_PROTOCOL_VERSION };

/**
 * A simple in-memory transport pair for testing.
 * Creates two linked transports: one for the server, one for the test client.
 */
function createTransportPair(): {
	client: InMemoryTransport;
	server: InMemoryTransport;
} {
	const clientTransport = new InMemoryTransport();
	const serverTransport = new InMemoryTransport();

	// Link them: when one sends, the other receives
	clientTransport.otherEnd = serverTransport;
	serverTransport.otherEnd = clientTransport;

	return { client: clientTransport, server: serverTransport };
}

class InMemoryTransport implements Transport {
	otherEnd: InMemoryTransport | null = null;
	onclose?: () => void;
	onerror?: (error: Error) => void;
	onmessage?: (message: JSONRPCMessage) => void;

	async start(): Promise<void> {
		// No-op for in-memory transport
	}

	async send(message: JSONRPCMessage): Promise<void> {
		// Deliver to the other end's onmessage
		if (this.otherEnd?.onmessage) {
			// Use queueMicrotask to simulate async delivery
			queueMicrotask(() => {
				this.otherEnd?.onmessage?.(message);
			});
		}
	}

	async close(): Promise<void> {
		this.otherEnd = null;
		this.onclose?.();
	}
}

export interface McpTestClient {
	send(message: JSONRPCMessage): void;
	readResponse(): Promise<Record<string, unknown>>;
	close(): Promise<void>;
}

/**
 * Creates a test client connected to the MCP server via in-memory transport.
 */
export async function createTestClient(): Promise<McpTestClient> {
	const { client: clientTransport, server: serverTransport } =
		createTransportPair();

	const server = createServer();
	await server.connect(serverTransport);

	const responseQueue: Record<string, unknown>[] = [];
	let waitingResolve: ((msg: Record<string, unknown>) => void) | null = null;

	clientTransport.onmessage = (message: JSONRPCMessage) => {
		const msg = message as unknown as Record<string, unknown>;
		if (waitingResolve) {
			const resolve = waitingResolve;
			waitingResolve = null;
			resolve(msg);
		} else {
			responseQueue.push(msg);
		}
	};

	// Start the client transport
	await clientTransport.start();

	return {
		send(message: JSONRPCMessage) {
			clientTransport.send(message);
		},

		readResponse(): Promise<Record<string, unknown>> {
			if (responseQueue.length > 0) {
				return Promise.resolve(
					responseQueue.shift() as Record<string, unknown>,
				);
			}
			return new Promise((resolve) => {
				waitingResolve = resolve;
			});
		},

		async close() {
			await server.close();
			await clientTransport.close();
		},
	};
}

/**
 * Sends an MCP initialize handshake and returns the result.
 */
export async function initializeClient(client: McpTestClient) {
	client.send({
		jsonrpc: "2.0",
		id: 1,
		method: "initialize",
		params: {
			protocolVersion: LATEST_PROTOCOL_VERSION,
			capabilities: {},
			clientInfo: { name: "test-client", version: "1.0.0" },
		},
	} as unknown as JSONRPCMessage);

	const initResponse = await client.readResponse();

	// Send initialized notification
	client.send({
		jsonrpc: "2.0",
		method: "notifications/initialized",
	} as unknown as JSONRPCMessage);

	// Small delay to let notification process
	await new Promise((r) => setTimeout(r, 50));

	return initResponse;
}

/**
 * Helper to make a JWT token with a given expiry (seconds since epoch).
 */
export function makeJwt(exp: number): string {
	const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
	const payload = btoa(JSON.stringify({ exp }));
	const signature = btoa("fake-signature");
	return `${header}.${payload}.${signature}`;
}
