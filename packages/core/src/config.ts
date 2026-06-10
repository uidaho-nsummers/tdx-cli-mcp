import { z } from "zod";

const configSchema = z.object({
	TDX_BASE_URL: z.string().url().describe("Base URL for the TDX Web API"),
	TDX_BEID: z.string().min(1).describe("Admin BEID for authentication"),
	TDX_WEB_SERVICES_KEY: z
		.string()
		.min(1)
		.describe("Admin Web Services Key for authentication"),
	TDX_TICKETING_APP_ID: z
		.string()
		.min(1)
		.transform(Number)
		.pipe(z.number().int().positive())
		.describe("Ticketing application ID"),
	TDX_ASSET_APP_ID: z
		.string()
		.min(1)
		.transform(Number)
		.pipe(z.number().int().positive())
		.describe("Asset/CI application ID"),
	TDX_KB_APP_ID: z
		.string()
		.min(1)
		.transform(Number)
		.pipe(z.number().int().positive())
		.describe("Knowledge Base application ID"),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
	const result = configSchema.safeParse(process.env);
	if (!result.success) {
		const errors = result.error.issues
			.map((i) => `  ${i.path.join(".")}: ${i.message}`)
			.join("\n");
		throw new Error(`Invalid configuration:\n${errors}`);
	}
	return result.data;
}

let cachedConfig: Config | null = null;

export function getConfig(): Config {
	if (!cachedConfig) {
		cachedConfig = loadConfig();
	}
	return cachedConfig;
}

/** Reset cached config (for testing). */
export function resetConfig(): void {
	cachedConfig = null;
}
