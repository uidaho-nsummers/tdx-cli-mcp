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
} from "../schemas/tickets.js";

const appId = () => getConfig().TDX_TICKETING_APP_ID;

export async function ticketsSearch(
	args: z.infer<typeof ticketSearchInputSchema>,
): Promise<unknown> {
	const { data } = await tdxRequest({
		method: "POST",
		path: `/${appId()}/tickets/search`,
		body: args,
	});
	return data;
}

export async function ticketsGet(
	args: z.infer<typeof ticketGetInputSchema>,
): Promise<unknown> {
	const { data } = await tdxRequest({
		path: `/${appId()}/tickets/${args.id}`,
	});
	return data;
}

export async function ticketsCreate(
	args: z.infer<typeof ticketCreateInputSchema>,
): Promise<unknown> {
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
	return data;
}

export async function ticketsUpdate(
	args: z.infer<typeof ticketUpdateInputSchema>,
): Promise<unknown> {
	const { id, patches, notifyNewResponsible } = args;
	const { data } = await tdxRequest({
		method: "PATCH",
		path: `/${appId()}/tickets/${id}`,
		body: patches,
		query: {
			notifyNewResponsible: String(notifyNewResponsible),
		},
	});
	return data;
}

export async function ticketsFeedGet(
	args: z.infer<typeof ticketFeedGetInputSchema>,
): Promise<unknown> {
	const { data } = await tdxRequest({
		path: `/${appId()}/tickets/${args.id}/feed`,
	});
	return data;
}

export async function ticketsFeedPost(
	args: z.infer<typeof ticketFeedPostInputSchema>,
): Promise<unknown> {
	const { id, ...body } = args;
	const { data } = await tdxRequest({
		method: "POST",
		path: `/${appId()}/tickets/${id}/feed`,
		body,
	});
	return data;
}
