import type { CallToolResult } from "@modelcontextprotocol/server";
import type { z } from "zod";
import { tdxRequest } from "../api/client.js";
import { getConfig } from "../config.js";
import type {
	ticketCreateInputSchema,
	ticketFeedGetInputSchema,
	ticketFeedPostInputSchema,
	ticketGetInputSchema,
	ticketSearchInputSchema,
	ticketUpdateInputSchema,
} from "./schemas/tickets.js";
import { textResult } from "./utils.js";

const appId = () => getConfig().TDX_TICKETING_APP_ID;

export async function ticketsSearch(
	args: z.infer<typeof ticketSearchInputSchema>,
): Promise<CallToolResult> {
	const { data } = await tdxRequest({
		method: "POST",
		path: `/${appId()}/tickets/search`,
		body: args,
	});
	return textResult(data);
}

export async function ticketsGet(
	args: z.infer<typeof ticketGetInputSchema>,
): Promise<CallToolResult> {
	const { data } = await tdxRequest({
		path: `/${appId()}/tickets/${args.id}`,
	});
	return textResult(data);
}

export async function ticketsCreate(
	args: z.infer<typeof ticketCreateInputSchema>,
): Promise<CallToolResult> {
	const {
		NotifyRequestor,
		NotifyResponsible,
		EnableNotifyReviewer,
		AllowRequestorCreation,
		applyDefaults,
		...body
	} = args;
	const { data } = await tdxRequest({
		method: "POST",
		path: `/${appId()}/tickets`,
		body,
		query: {
			NotifyRequestor: String(NotifyRequestor),
			NotifyResponsible: String(NotifyResponsible),
			EnableNotifyReviewer: String(EnableNotifyReviewer),
			AllowRequestorCreation: String(AllowRequestorCreation),
			applyDefaults: String(applyDefaults),
		},
	});
	return textResult(data);
}

export async function ticketsUpdate(
	args: z.infer<typeof ticketUpdateInputSchema>,
): Promise<CallToolResult> {
	const { id, patches, notifyNewResponsible } = args;
	const { data } = await tdxRequest({
		method: "PATCH",
		path: `/${appId()}/tickets/${id}`,
		body: patches,
		query: {
			notifyNewResponsible: String(notifyNewResponsible),
		},
	});
	return textResult(data);
}

export async function ticketsFeedGet(
	args: z.infer<typeof ticketFeedGetInputSchema>,
): Promise<CallToolResult> {
	const { data } = await tdxRequest({
		path: `/${appId()}/tickets/${args.id}/feed`,
	});
	return textResult(data);
}

export async function ticketsFeedPost(
	args: z.infer<typeof ticketFeedPostInputSchema>,
): Promise<CallToolResult> {
	const { id, ...body } = args;
	const { data } = await tdxRequest({
		method: "POST",
		path: `/${appId()}/tickets/${id}/feed`,
		body,
	});
	return textResult(data);
}
