import { describe, expect, test } from "vitest";
import {
	getRetryWaitMs,
	recordCall,
	waitIfNeeded,
} from "../../src/api/rate-limiter.ts";

// The rate-limiter uses a module-level Map. We use unique paths to isolate tests.
let testCounter = 0;
function uniquePath(): string {
	return `/unique-${Date.now()}-${testCounter++}`;
}

describe("rate limiter", () => {
	describe("recordCall and tracking", () => {
		test("tracks calls per endpoint", () => {
			const path = uniquePath();
			recordCall("GET", path);
			recordCall("GET", path);
			// getRetryWaitMs returns time until oldest call exits window
			// With 2 recent calls, it should be close to windowMs (60s)
			const waitMs = getRetryWaitMs("GET", path);
			expect(waitMs).toBeGreaterThan(0);
			expect(waitMs).toBeLessThanOrEqual(60_000);
		});

		test("tracks different endpoints independently", () => {
			const path1 = uniquePath();
			const path2 = uniquePath();
			recordCall("GET", path1);
			// path2 has no calls, so should return 1000 (no-record default)
			expect(getRetryWaitMs("POST", path2)).toBe(1_000);
			// path1 has a call, should return ~60s
			expect(getRetryWaitMs("GET", path1)).toBeGreaterThan(1_000);
		});
	});

	describe("endpoint key normalization", () => {
		test("strips leading /{appId}/ prefix from path", () => {
			// Recording at /42/foo and /99/foo should normalize to the same key
			const suffix = `normalize-${Date.now()}`;
			recordCall("POST", `/42/${suffix}`);
			// Both paths should resolve to the same endpoint key
			const wait1 = getRetryWaitMs("POST", `/42/${suffix}`);
			const wait2 = getRetryWaitMs("POST", `/99/${suffix}`);
			// Both should have the same wait since they hit the same key
			expect(wait1).toBe(wait2);
		});
	});

	describe("endpoint-specific limits", () => {
		test("uses specific config for tickets/search (30 calls/60s)", () => {
			// Fill up the tickets/search limit
			// Use the actual well-known path so it matches ENDPOINT_LIMITS
			for (let i = 0; i < 30; i++) {
				recordCall("POST", `/42/tickets/search`);
			}
			const waitMs = getRetryWaitMs("POST", `/42/tickets/search`);
			expect(waitMs).toBeGreaterThan(1_000);
		});
	});

	describe("waitIfNeeded", () => {
		test("returns immediately when no prior calls recorded", async () => {
			const path = uniquePath();
			const start = Date.now();
			await waitIfNeeded("GET", path);
			expect(Date.now() - start).toBeLessThan(50);
		});

		test("returns immediately when under the limit", async () => {
			const path = uniquePath();
			recordCall("GET", path); // 1 call, limit is 60
			const start = Date.now();
			await waitIfNeeded("GET", path);
			expect(Date.now() - start).toBeLessThan(50);
		});
	});

	describe("getRetryWaitMs", () => {
		test("returns 1000ms when no calls recorded", () => {
			const path = uniquePath();
			expect(getRetryWaitMs("GET", path)).toBe(1_000);
		});

		test("returns wait time based on oldest call in window", () => {
			const path = uniquePath();
			recordCall("GET", path);
			const waitMs = getRetryWaitMs("GET", path);
			// Should be close to the full window (60s) since the call was just recorded
			expect(waitMs).toBeGreaterThan(59_000);
			expect(waitMs).toBeLessThanOrEqual(60_000);
		});

		test("returns at least 1000ms minimum", () => {
			const path = uniquePath();
			recordCall("GET", path);
			expect(getRetryWaitMs("GET", path)).toBeGreaterThanOrEqual(1_000);
		});
	});

	describe("window expiry", () => {
		test("pruning keeps only recent timestamps on recordCall", () => {
			const path = uniquePath();
			recordCall("GET", path);
			// Immediately recording again should not double the wait
			recordCall("GET", path);
			const waitMs = getRetryWaitMs("GET", path);
			// Should still be within one window
			expect(waitMs).toBeLessThanOrEqual(60_000);
		});
	});
});
