import { McpServer } from "@modelcontextprotocol/server";
import { applicationsList } from "./tools/applications.js";
import { assetsGet, assetsSearch } from "./tools/assets.js";
import { kbGet, kbSearch } from "./tools/kb.js";
import { peopleGet, peopleSearch } from "./tools/people.js";
import { applicationsListInputSchema } from "./tools/schemas/applications.js";
import {
	assetGetInputSchema,
	assetSearchInputSchema,
} from "./tools/schemas/assets.js";
import { kbGetInputSchema, kbSearchInputSchema } from "./tools/schemas/kb.js";
import {
	peopleGetInputSchema,
	peopleSearchInputSchema,
} from "./tools/schemas/people.js";
import {
	ticketCreateInputSchema,
	ticketFeedGetInputSchema,
	ticketFeedPostInputSchema,
	ticketGetInputSchema,
	ticketSearchInputSchema,
	ticketUpdateInputSchema,
} from "./tools/schemas/tickets.js";
import {
	ticketsCreate,
	ticketsFeedGet,
	ticketsFeedPost,
	ticketsGet,
	ticketsSearch,
	ticketsUpdate,
} from "./tools/tickets.js";
import { safeToolCall } from "./tools/utils.js";

export function createServer(): McpServer {
	const server = new McpServer({
		name: "tdx-mcp-server",
		version: "0.1.0",
	});

	// Ticket tools
	server.registerTool(
		"tdx_tickets_search",
		{
			description:
				"Search for tickets in TeamDynamix. Returns abbreviated results (no Description/Attributes). Use tdx_tickets_get for full details.",
			inputSchema: ticketSearchInputSchema,
		},
		async (args) => safeToolCall(() => ticketsSearch(args)),
	);

	server.registerTool(
		"tdx_tickets_get",
		{
			description:
				"Get a specific ticket by ID from TeamDynamix. Returns full details including Description and Attributes.",
			inputSchema: ticketGetInputSchema,
		},
		async (args) => safeToolCall(() => ticketsGet(args)),
	);

	server.registerTool(
		"tdx_tickets_create",
		{
			description: "Create a new ticket in TeamDynamix",
			inputSchema: ticketCreateInputSchema,
		},
		async (args) => safeToolCall(() => ticketsCreate(args)),
	);

	server.registerTool(
		"tdx_tickets_update",
		{
			description:
				"Update an existing ticket in TeamDynamix using JSON Patch operations (RFC 6902). Each patch has op (add/remove/replace), path, and value.",
			inputSchema: ticketUpdateInputSchema,
		},
		async (args) => safeToolCall(() => ticketsUpdate(args)),
	);

	server.registerTool(
		"tdx_tickets_feed_get",
		{
			description: "Get the activity feed for a ticket in TeamDynamix",
			inputSchema: ticketFeedGetInputSchema,
		},
		async (args) => safeToolCall(() => ticketsFeedGet(args)),
	);

	server.registerTool(
		"tdx_tickets_feed_post",
		{
			description: "Post a comment to a ticket's activity feed in TeamDynamix",
			inputSchema: ticketFeedPostInputSchema,
		},
		async (args) => safeToolCall(() => ticketsFeedPost(args)),
	);

	// Asset tools
	server.registerTool(
		"tdx_assets_search",
		{
			description:
				"Search for assets/CIs in TeamDynamix. Returns abbreviated results. Use tdx_assets_get for full details.",
			inputSchema: assetSearchInputSchema,
		},
		async (args) => safeToolCall(() => assetsSearch(args)),
	);

	server.registerTool(
		"tdx_assets_get",
		{
			description: "Get a specific asset/CI by ID from TeamDynamix",
			inputSchema: assetGetInputSchema,
		},
		async (args) => safeToolCall(() => assetsGet(args)),
	);

	// Knowledge Base tools
	server.registerTool(
		"tdx_kb_search",
		{
			description: "Search the Knowledge Base in TeamDynamix",
			inputSchema: kbSearchInputSchema,
		},
		async (args) => safeToolCall(() => kbSearch(args)),
	);

	server.registerTool(
		"tdx_kb_get",
		{
			description: "Get a specific Knowledge Base article from TeamDynamix",
			inputSchema: kbGetInputSchema,
		},
		async (args) => safeToolCall(() => kbGet(args)),
	);

	// People tools
	server.registerTool(
		"tdx_people_search",
		{
			description: "Search for people in TeamDynamix",
			inputSchema: peopleSearchInputSchema,
		},
		async (args) => safeToolCall(() => peopleSearch(args)),
	);

	server.registerTool(
		"tdx_people_get",
		{
			description: "Get a specific person by UID from TeamDynamix",
			inputSchema: peopleGetInputSchema,
		},
		async (args) => safeToolCall(() => peopleGet(args)),
	);

	// Applications tool
	server.registerTool(
		"tdx_applications_list",
		{
			description: "List all applications in TeamDynamix",
			inputSchema: applicationsListInputSchema,
		},
		async () => safeToolCall(() => applicationsList()),
	);

	return server;
}
