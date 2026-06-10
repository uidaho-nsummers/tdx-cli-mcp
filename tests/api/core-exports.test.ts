import {
	clearAuthToken,
	getAuthToken,
	getConfig,
	getRetryWaitMs,
	recordCall,
	resetConfig,
	TdxApiError,
	tdxRequest,
	waitIfNeeded,
} from "@tdx/core";
import { describe, expect, test } from "vitest";

describe("@tdx/core public API", () => {
	test("exports core auth, config, API client, and rate limiter primitives", () => {
		expect(getAuthToken).toBeTypeOf("function");
		expect(clearAuthToken).toBeTypeOf("function");
		expect(getConfig).toBeTypeOf("function");
		expect(resetConfig).toBeTypeOf("function");
		expect(tdxRequest).toBeTypeOf("function");
		expect(TdxApiError).toBeTypeOf("function");
		expect(waitIfNeeded).toBeTypeOf("function");
		expect(recordCall).toBeTypeOf("function");
		expect(getRetryWaitMs).toBeTypeOf("function");
	});
});
