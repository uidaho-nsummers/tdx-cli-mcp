import type { z } from "zod";
import { tdxRequest } from "../api/client.js";
import {
	peopleGetInputSchema,
	peopleSearchInputSchema,
} from "../schemas/people.js";

export async function peopleSearch(
	args: z.input<typeof peopleSearchInputSchema>,
): Promise<unknown> {
	const input = peopleSearchInputSchema.parse(args);
	const { data } = await tdxRequest({
		method: "POST",
		path: "/people/search",
		body: input,
	});
	return data;
}

export async function peopleGet(
	args: z.input<typeof peopleGetInputSchema>,
): Promise<unknown> {
	const input = peopleGetInputSchema.parse(args);
	const { data } = await tdxRequest({
		path: `/people/${input.uid}`,
	});
	return data;
}
