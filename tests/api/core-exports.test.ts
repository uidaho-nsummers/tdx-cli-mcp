import {
	applicationsList,
	applicationsListInputSchema,
	assetGetInputSchema,
	assetSearchInputSchema,
	assetsGet,
	assetsSearch,
	clearAuthToken,
	getAuthToken,
	getConfig,
	getRetryWaitMs,
	kbGet,
	kbGetInputSchema,
	kbSearch,
	kbSearchInputSchema,
	peopleGet,
	peopleGetInputSchema,
	peopleSearch,
	peopleSearchInputSchema,
	recordCall,
	resetConfig,
	TdxApiError,
	tdxRequest,
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

	test("exports all domain operations", () => {
		expect(ticketsSearch).toBeTypeOf("function");
		expect(ticketsGet).toBeTypeOf("function");
		expect(ticketsCreate).toBeTypeOf("function");
		expect(ticketsUpdate).toBeTypeOf("function");
		expect(ticketsFeedGet).toBeTypeOf("function");
		expect(ticketsFeedPost).toBeTypeOf("function");
		expect(assetsSearch).toBeTypeOf("function");
		expect(assetsGet).toBeTypeOf("function");
		expect(kbSearch).toBeTypeOf("function");
		expect(kbGet).toBeTypeOf("function");
		expect(peopleSearch).toBeTypeOf("function");
		expect(peopleGet).toBeTypeOf("function");
		expect(applicationsList).toBeTypeOf("function");
	});

	test("exports all domain Zod input schemas", () => {
		expect(ticketSearchInputSchema).toBeDefined();
		expect(ticketGetInputSchema).toBeDefined();
		expect(ticketCreateInputSchema).toBeDefined();
		expect(ticketUpdateInputSchema).toBeDefined();
		expect(ticketFeedGetInputSchema).toBeDefined();
		expect(ticketFeedPostInputSchema).toBeDefined();
		expect(assetSearchInputSchema).toBeDefined();
		expect(assetGetInputSchema).toBeDefined();
		expect(kbSearchInputSchema).toBeDefined();
		expect(kbGetInputSchema).toBeDefined();
		expect(peopleSearchInputSchema).toBeDefined();
		expect(peopleGetInputSchema).toBeDefined();
		expect(applicationsListInputSchema).toBeDefined();
	});
});
