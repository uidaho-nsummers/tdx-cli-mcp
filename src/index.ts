import "dotenv/config";
import { StdioServerTransport } from "@modelcontextprotocol/server";
import { createServer } from "./server.js";

const server = createServer();
const transport = new StdioServerTransport();

await server.connect(transport);

const shutdown = async () => {
	await server.server.close();
	process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
