import { describe, expect, test } from "bun:test";

const VALID_ENV = {
	TDX_BASE_URL: "https://tdx.example.com/TDWebApi/api",
	TDX_BEID: "some-beid-value",
	TDX_WEB_SERVICES_KEY: "some-web-services-key",
	TDX_TICKETING_APP_ID: "42",
	TDX_ASSET_APP_ID: "10",
	TDX_KB_APP_ID: "20",
};

function loadConfigFromEnv(env: Record<string, string>) {
	// We import the zod schema logic inline to test it without module-level side effects
	const { z } = require("zod");

	const configSchema = z.object({
		TDX_BASE_URL: z.string().url(),
		TDX_BEID: z.string().min(1),
		TDX_WEB_SERVICES_KEY: z.string().min(1),
		TDX_TICKETING_APP_ID: z
			.string()
			.min(1)
			.transform(Number)
			.pipe(z.number().int().positive()),
		TDX_ASSET_APP_ID: z
			.string()
			.min(1)
			.transform(Number)
			.pipe(z.number().int().positive()),
		TDX_KB_APP_ID: z
			.string()
			.min(1)
			.transform(Number)
			.pipe(z.number().int().positive()),
	});

	const result = configSchema.safeParse(env);
	if (!result.success) {
		const errors = result.error.issues
			.map(
				(i: { path: string[]; message: string }) =>
					`  ${i.path.join(".")}: ${i.message}`,
			)
			.join("\n");
		throw new Error(`Invalid configuration:\n${errors}`);
	}
	return result.data;
}

describe("config loading", () => {
	describe("valid configuration", () => {
		test("loads all required env vars correctly", () => {
			const config = loadConfigFromEnv(VALID_ENV);
			expect(config.TDX_BASE_URL).toBe("https://tdx.example.com/TDWebApi/api");
			expect(config.TDX_BEID).toBe("some-beid-value");
			expect(config.TDX_WEB_SERVICES_KEY).toBe("some-web-services-key");
		});

		test("transforms app IDs from strings to numbers", () => {
			const config = loadConfigFromEnv(VALID_ENV);
			expect(config.TDX_TICKETING_APP_ID).toBe(42);
			expect(config.TDX_ASSET_APP_ID).toBe(10);
			expect(config.TDX_KB_APP_ID).toBe(20);
		});
	});

	describe("missing required vars", () => {
		test("throws when TDX_BASE_URL is missing", () => {
			const { TDX_BASE_URL, ...env } = VALID_ENV;
			expect(() => loadConfigFromEnv(env)).toThrow("Invalid configuration");
		});

		test("throws when TDX_BEID is missing", () => {
			const { TDX_BEID, ...env } = VALID_ENV;
			expect(() => loadConfigFromEnv(env)).toThrow("Invalid configuration");
		});

		test("throws when TDX_WEB_SERVICES_KEY is missing", () => {
			const { TDX_WEB_SERVICES_KEY, ...env } = VALID_ENV;
			expect(() => loadConfigFromEnv(env)).toThrow("Invalid configuration");
		});

		test("throws when TDX_TICKETING_APP_ID is missing", () => {
			const { TDX_TICKETING_APP_ID, ...env } = VALID_ENV;
			expect(() => loadConfigFromEnv(env)).toThrow("Invalid configuration");
		});

		test("throws when TDX_ASSET_APP_ID is missing", () => {
			const { TDX_ASSET_APP_ID, ...env } = VALID_ENV;
			expect(() => loadConfigFromEnv(env)).toThrow("Invalid configuration");
		});

		test("throws when TDX_KB_APP_ID is missing", () => {
			const { TDX_KB_APP_ID, ...env } = VALID_ENV;
			expect(() => loadConfigFromEnv(env)).toThrow("Invalid configuration");
		});

		test("throws when all env vars are missing", () => {
			expect(() => loadConfigFromEnv({})).toThrow("Invalid configuration");
		});
	});

	describe("invalid URL format", () => {
		test("rejects non-URL string for TDX_BASE_URL", () => {
			expect(() =>
				loadConfigFromEnv({ ...VALID_ENV, TDX_BASE_URL: "not-a-url" }),
			).toThrow("Invalid configuration");
		});

		test("rejects empty string for TDX_BASE_URL", () => {
			expect(() =>
				loadConfigFromEnv({ ...VALID_ENV, TDX_BASE_URL: "" }),
			).toThrow("Invalid configuration");
		});
	});

	describe("invalid app IDs", () => {
		test("rejects non-numeric TDX_TICKETING_APP_ID", () => {
			expect(() =>
				loadConfigFromEnv({ ...VALID_ENV, TDX_TICKETING_APP_ID: "abc" }),
			).toThrow("Invalid configuration");
		});

		test("rejects zero TDX_TICKETING_APP_ID", () => {
			expect(() =>
				loadConfigFromEnv({ ...VALID_ENV, TDX_TICKETING_APP_ID: "0" }),
			).toThrow("Invalid configuration");
		});

		test("rejects negative TDX_ASSET_APP_ID", () => {
			expect(() =>
				loadConfigFromEnv({ ...VALID_ENV, TDX_ASSET_APP_ID: "-1" }),
			).toThrow("Invalid configuration");
		});

		test("rejects decimal TDX_KB_APP_ID", () => {
			expect(() =>
				loadConfigFromEnv({ ...VALID_ENV, TDX_KB_APP_ID: "1.5" }),
			).toThrow("Invalid configuration");
		});

		test("rejects empty app ID", () => {
			expect(() =>
				loadConfigFromEnv({ ...VALID_ENV, TDX_TICKETING_APP_ID: "" }),
			).toThrow("Invalid configuration");
		});
	});

	describe("partial config rejected", () => {
		test("rejects config with only URL and BEID", () => {
			expect(() =>
				loadConfigFromEnv({
					TDX_BASE_URL: VALID_ENV.TDX_BASE_URL,
					TDX_BEID: VALID_ENV.TDX_BEID,
				}),
			).toThrow("Invalid configuration");
		});

		test("rejects config missing only one app ID", () => {
			const { TDX_KB_APP_ID, ...env } = VALID_ENV;
			expect(() => loadConfigFromEnv(env)).toThrow("Invalid configuration");
		});
	});
});
