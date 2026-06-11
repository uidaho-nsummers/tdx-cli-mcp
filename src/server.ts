import { McpServer } from "@modelcontextprotocol/server";
import {
	applicationsList,
	applicationsListInputSchema,
	assetGetInputSchema,
	assetSearchInputSchema,
	assetsGet,
	assetsSearch,
	kbGet,
	kbGetInputSchema,
	kbSearch,
	kbSearchInputSchema,
	peopleGet,
	peopleGetInputSchema,
	peopleSearch,
	peopleSearchInputSchema,
	ticketCreateInputSchema,
	ticketFeedGetInputSchema,
	ticketFeedPostInputSchema,
	ticketGetInputSchema,
	ticketSearchInputSchema,
	ticketsCreate,
	ticketsFeedGet,
	ticketsFeedPost,
	ticketsGet,
	ticketsSearch,
	ticketsUpdate,
	ticketUpdateInputSchema,
} from "@tdx/core";
import { safeToolCall, textResult } from "./tools/utils.js";

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
		async (args) =>
			safeToolCall(async () => textResult(await ticketsSearch(args))),
	);

	server.registerTool(
		"tdx_tickets_get",
		{
			description:
				"Get a specific ticket by ID from TeamDynamix. Returns full details including Description and Attributes.",
			inputSchema: ticketGetInputSchema,
		},
		async (args) =>
			safeToolCall(async () => textResult(await ticketsGet(args))),
	);

	server.registerTool(
		"tdx_tickets_create",
		{
			description: "Create a new ticket in TeamDynamix",
			inputSchema: ticketCreateInputSchema,
		},
		async (args) =>
			safeToolCall(async () => textResult(await ticketsCreate(args))),
	);

	server.registerTool(
		"tdx_tickets_update",
		{
			description:
				"Update an existing ticket in TeamDynamix using JSON Patch operations (RFC 6902). Each patch has op (add/remove/replace), path, and value.",
			inputSchema: ticketUpdateInputSchema,
		},
		async (args) =>
			safeToolCall(async () => textResult(await ticketsUpdate(args))),
	);

	server.registerTool(
		"tdx_tickets_feed_get",
		{
			description: "Get the activity feed for a ticket in TeamDynamix",
			inputSchema: ticketFeedGetInputSchema,
		},
		async (args) =>
			safeToolCall(async () => textResult(await ticketsFeedGet(args))),
	);

	server.registerTool(
		"tdx_tickets_feed_post",
		{
			description: "Post a comment to a ticket's activity feed in TeamDynamix",
			inputSchema: ticketFeedPostInputSchema,
		},
		async (args) =>
			safeToolCall(async () => textResult(await ticketsFeedPost(args))),
	);

	// Asset tools
	server.registerTool(
		"tdx_assets_search",
		{
			description:
				"Search for assets/CIs in TeamDynamix. Returns abbreviated results. Use tdx_assets_get for full details.",
			inputSchema: assetSearchInputSchema,
		},
		async (args) =>
			safeToolCall(async () => textResult(await assetsSearch(args))),
	);

	server.registerTool(
		"tdx_assets_get",
		{
			description: "Get a specific asset/CI by ID from TeamDynamix",
			inputSchema: assetGetInputSchema,
		},
		async (args) => safeToolCall(async () => textResult(await assetsGet(args))),
	);

	// Knowledge Base tools
	server.registerTool(
		"tdx_kb_search",
		{
			description: "Search the Knowledge Base in TeamDynamix",
			inputSchema: kbSearchInputSchema,
		},
		async (args) => safeToolCall(async () => textResult(await kbSearch(args))),
	);

	server.registerTool(
		"tdx_kb_get",
		{
			description: "Get a specific Knowledge Base article from TeamDynamix",
			inputSchema: kbGetInputSchema,
		},
		async (args) => safeToolCall(async () => textResult(await kbGet(args))),
	);

	// People tools
	server.registerTool(
		"tdx_people_search",
		{
			description: "Search for people in TeamDynamix",
			inputSchema: peopleSearchInputSchema,
		},
		async (args) =>
			safeToolCall(async () => textResult(await peopleSearch(args))),
	);

	server.registerTool(
		"tdx_people_get",
		{
			description: "Get a specific person by UID from TeamDynamix",
			inputSchema: peopleGetInputSchema,
		},
		async (args) => safeToolCall(async () => textResult(await peopleGet(args))),
	);

	// Applications tool
	server.registerTool(
		"tdx_applications_list",
		{
			description: "List all applications in TeamDynamix",
			inputSchema: applicationsListInputSchema,
		},
		async () => safeToolCall(async () => textResult(await applicationsList())),
	);

	return server;
}
