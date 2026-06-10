import { clearAuthToken, getAuthToken } from "../auth/client.js";
import { getConfig } from "../config.js";
import { getRetryWaitMs, recordCall, waitIfNeeded } from "./rate-limiter.js";

const MAX_RETRIES = 3;

export interface TdxRequestOptions {
	method?: string;
	path: string;
	body?: unknown;
	query?: Record<string, string>;
}

export interface TdxResponse<T = unknown> {
	data: T;
	headers: Headers;
}

export class TdxApiError extends Error {
	constructor(
		public status: number,
		public statusText: string,
		public body: string,
	) {
		super(`TDX API error ${status}: ${statusText}`);
		this.name = "TdxApiError";
	}
}

export async function tdxRequest<T = unknown>(
	options: TdxRequestOptions,
): Promise<TdxResponse<T>> {
	const { method = "GET", path, body, query } = options;

	const url = new URL(`${getConfig().TDX_BASE_URL}${path}`);
	if (query) {
		for (const [k, v] of Object.entries(query)) {
			url.searchParams.set(k, v);
		}
	}

	const requestBody = body != null ? JSON.stringify(body) : undefined;

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		await waitIfNeeded(method, path);

		const token = await getAuthToken();
		const response = await fetch(url.toString(), {
			method,
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: requestBody,
		});

		recordCall(method, path);

		if (response.status === 429 && attempt < MAX_RETRIES) {
			const waitMs = getRetryWaitMs(method, path);
			await new Promise((resolve) => setTimeout(resolve, waitMs));
			continue;
		}

		if (!response.ok) {
			if (response.status === 401) {
				clearAuthToken();
			}
			const errorBody = await response.text();
			throw new TdxApiError(response.status, response.statusText, errorBody);
		}

		const text = await response.text();
		const data = text ? (JSON.parse(text) as T) : (undefined as T);
		return { data, headers: response.headers };
	}

	throw new Error("Max retries exceeded for rate-limited request");
}
