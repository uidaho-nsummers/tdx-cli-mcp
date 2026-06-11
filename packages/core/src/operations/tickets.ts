import type { z } from "zod";
import { tdxRequest } from "../api/client.js";
import { getConfig } from "../config.js";
import {
	ticketCreateInputSchema,
	ticketFeedGetInputSchema,
	ticketFeedPostInputSchema,
	ticketGetInputSchema,
	ticketSearchInputSchema,
	ticketUpdateInputSchema,
} from "../schemas/tickets.js";

const appId = () => getConfig().TDX_TICKETING_APP_ID;

export async function ticketsSearch(
	args: z.input<typeof ticketSearchInputSchema>,
): Promise<unknown> {
	const input = ticketSearchInputSchema.parse(args);
	const { data } = await tdxRequest({
		method: "POST",
		path: `/${appId()}/tickets/search`,
		body: input,
	});
	return data;
}

export async function ticketsGet(
	args: z.input<typeof ticketGetInputSchema>,
): Promise<unknown> {
	const input = ticketGetInputSchema.parse(args);
	const { data } = await tdxRequest({
		path: `/${appId()}/tickets/${input.id}`,
	});
	return data;
}

export async function ticketsCreate(
	args: z.input<typeof ticketCreateInputSchema>,
): Promise<unknown> {
	const input = ticketCreateInputSchema.parse(args);
	const {
		NotifyRequestor,
		NotifyResponsible,
		EnableNotifyReviewer,
		AllowRequestorCreation,
		applyDefaults,
		...body
	} = input;
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
	args: z.input<typeof ticketUpdateInputSchema>,
): Promise<unknown> {
	const { id, patches, notifyNewResponsible } =
		ticketUpdateInputSchema.parse(args);
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
	args: z.input<typeof ticketFeedGetInputSchema>,
): Promise<unknown> {
	const input = ticketFeedGetInputSchema.parse(args);
	const { data } = await tdxRequest({
		path: `/${appId()}/tickets/${input.id}/feed`,
	});
	return data;
}

export async function ticketsFeedPost(
	args: z.input<typeof ticketFeedPostInputSchema>,
): Promise<unknown> {
	const { id, ...body } = ticketFeedPostInputSchema.parse(args);
	const { data } = await tdxRequest({
		method: "POST",
		path: `/${appId()}/tickets/${id}/feed`,
		body,
	});
	return data;
}
