import type { z } from "zod";
import { tdxRequest } from "../api/client.js";
import type {
	peopleGetInputSchema,
	peopleSearchInputSchema,
} from "../schemas/people.js";

export async function peopleSearch(
	args: z.infer<typeof peopleSearchInputSchema>,
): Promise<unknown> {
	const { data } = await tdxRequest({
		method: "POST",
		path: "/people/search",
		body: args,
	});
	return data;
}

export async function peopleGet(
	args: z.infer<typeof peopleGetInputSchema>,
): Promise<unknown> {
	const { data } = await tdxRequest({
		path: `/people/${args.uid}`,
	});
	return data;
}
