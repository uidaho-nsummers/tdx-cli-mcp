import { getConfig } from "../config.js";

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes before expiry

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

function decodeJwtExp(token: string): number {
	const parts = token.split(".");
	if (parts.length !== 3) {
		throw new Error("Invalid JWT format");
	}
	// biome-ignore lint/style/noNonNullAssertion: length check above guarantees parts[1] exists
	const payload = JSON.parse(atob(parts[1]!));
	if (typeof payload.exp !== "number") {
		throw new Error("JWT missing exp claim");
	}
	return payload.exp;
}

async function loginAdmin(): Promise<string> {
	const config = getConfig();
	const response = await fetch(`${config.TDX_BASE_URL}/auth/loginadmin`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			BEID: config.TDX_BEID,
			WebServicesKey: config.TDX_WEB_SERVICES_KEY,
		}),
	});

	if (!response.ok) {
		throw new Error(`Auth failed: ${response.status} ${response.statusText}`);
	}

	const token = await response.text();
	if (!token) {
		throw new Error("Auth returned empty token");
	}

	return token;
}

export async function getAuthToken(): Promise<string> {
	const now = Date.now();
	if (cachedToken && now < tokenExpiresAt - REFRESH_BUFFER_MS) {
		return cachedToken;
	}

	cachedToken = await loginAdmin();
	tokenExpiresAt = decodeJwtExp(cachedToken) * 1000;
	return cachedToken;
}
