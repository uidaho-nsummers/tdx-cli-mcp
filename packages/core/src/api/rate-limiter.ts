interface EndpointConfig {
	maxCalls: number;
	windowMs: number;
}

const DEFAULT_LIMIT: EndpointConfig = { maxCalls: 60, windowMs: 60_000 };

const ENDPOINT_LIMITS: Record<string, EndpointConfig> = {
	"POST:tickets/search": { maxCalls: 30, windowMs: 60_000 },
	"POST:tickets": { maxCalls: 120, windowMs: 60_000 },
	"POST:people": { maxCalls: 45, windowMs: 60_000 },
	"PATCH:people": { maxCalls: 45, windowMs: 60_000 },
	"POST:people/lookup": { maxCalls: 75, windowMs: 10_000 },
	"POST:assets/import": { maxCalls: 5, windowMs: 20_000 },
};

interface CallRecord {
	timestamps: number[];
}

const callRecords = new Map<string, CallRecord>();

function endpointKey(method: string, path: string): string {
	// Normalize path to match config keys - strip leading /{appId}/ prefix
	const normalized = path.replace(/^\/\d+\//, "");
	return `${method}:${normalized}`;
}

function getConfig(key: string): EndpointConfig {
	// Check for exact match first, then prefix matches
	if (ENDPOINT_LIMITS[key]) return ENDPOINT_LIMITS[key];
	for (const [pattern, config] of Object.entries(ENDPOINT_LIMITS)) {
		if (key.startsWith(pattern)) return config;
	}
	return DEFAULT_LIMIT;
}

export async function waitIfNeeded(
	method: string,
	path: string,
): Promise<void> {
	const key = endpointKey(method, path);
	const config = getConfig(key);
	const record = callRecords.get(key);
	if (!record) return;

	const now = Date.now();
	const windowStart = now - config.windowMs;
	const recentCalls = record.timestamps.filter((t) => t > windowStart);

	if (recentCalls.length >= config.maxCalls && recentCalls[0] !== undefined) {
		// Wait until the oldest call in the window expires
		const oldestInWindow = recentCalls[0];
		const waitMs = oldestInWindow + config.windowMs - now;
		if (waitMs > 0) {
			await new Promise((resolve) => setTimeout(resolve, waitMs));
		}
	}
}

export function recordCall(method: string, path: string): void {
	const key = endpointKey(method, path);
	const config = getConfig(key);
	const now = Date.now();

	let record = callRecords.get(key);
	if (!record) {
		record = { timestamps: [] };
		callRecords.set(key, record);
	}

	// Prune timestamps outside the window
	const windowStart = now - config.windowMs;
	record.timestamps = record.timestamps.filter((t) => t > windowStart);
	record.timestamps.push(now);
}

export function getRetryWaitMs(method: string, path: string): number {
	const key = endpointKey(method, path);
	const config = getConfig(key);
	const record = callRecords.get(key);
	if (!record || record.timestamps.length === 0) return 1_000;

	const now = Date.now();
	const windowStart = now - config.windowMs;
	const recentCalls = record.timestamps.filter((t) => t > windowStart);
	if (recentCalls.length === 0) return 1_000;

	// Wait until the oldest call in window expires
	const oldestInWindow = recentCalls[0];
	if (oldestInWindow === undefined) return 1_000;
	return Math.max(1_000, oldestInWindow + config.windowMs - now);
}
