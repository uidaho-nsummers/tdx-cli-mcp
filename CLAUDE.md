# TDX MCP Server

MCP server wrapping the TeamDynamix Web API. Node.js runtime (tsx for TypeScript execution), TypeScript strict mode, Zod validation, Biome formatting.

## Commands

- `npm start` — Start the MCP server (stdio transport); `npm run dev` for watch mode
- `npm test` — Run all tests (Vitest)
- `npm run test:watch` — Run tests in watch mode
- `npm run typecheck` — Type-check with tsc
- `npx biome check --write src/ tests/` — Format and lint

## Runtime

Use Node.js v26.3+ with tsx, not Bun. Node does not auto-load `.env` — the entry point imports `dotenv/config` first.

- `npx tsx <file>` not `bun <file>`
- `npm install` / `npm ci` not `bun install`
- `npx <pkg>` not `bunx <pkg>`

## Architecture

- `src/index.ts` — Entry point, stdio transport, graceful shutdown
- `src/server.ts` — MCP server, registers 13 tools via `createServer()`
- `src/config.ts` — Lazy-loaded Zod-validated env config (`getConfig()`)
- `src/auth/client.ts` — `getAuthToken()` with JWT cache + proactive refresh
- `src/api/client.ts` — `tdxRequest()` fetch wrapper with auth, retry on 429
- `src/api/rate-limiter.ts` — Client-side sliding window, per-endpoint limits
- `src/tools/*.ts` — Tool handlers, one file per domain
- `src/tools/schemas/*.ts` — Zod input schemas per tool
- `src/tools/utils.ts` — `safeToolCall()` error wrapper, `textResult()` helper

## Key design decisions

- **Config is lazy.** `getConfig()` validates on first call, not at import time. This allows tests to mock config before it loads.
- **No rate limit headers.** TDX doesn't return `X-RateLimit-*` headers. Limits are tracked client-side with per-endpoint configs in `rate-limiter.ts`.
- **No cursor pagination.** TDX search uses `MaxResults`/`ReturnCount` in request body, not page indexes. Use date ranges for windowing.
- **PATCH uses JSON Patch (RFC 6902)**, not JSON Merge Patch. The `ticketUpdateInputSchema` accepts a `patches` array with `op`/`path`/`value`.
- **Error sanitization.** `safeToolCall()` catches `TdxApiError` and returns only the HTTP status — raw error bodies are never exposed to MCP consumers.
- **UID fields use `.uuid()` validation** to prevent path injection via string-typed IDs.

## Testing

Tests use Vitest. Vitest isolates module mocks per file natively, so unit and QA tests run together in a single `vitest run`.

- `tests/` — Unit tests, mirror `src/` structure
- `tests/qa/` — End-to-end MCP server tests with in-memory transport
- `tests/fixtures/` — Realistic TDX API response data
- `tests/setup.ts` — Registers custom `toBeArray()`/`toBeString()` matchers

When mocking config in tests, mock `getConfig` as a function:

```ts
vi.mock("../../src/config.ts", () => ({
  getConfig: () => ({
    TDX_BASE_URL: "https://tdx.example.com/TDWebApi/api",
    TDX_BEID: "test-beid",
    TDX_WEB_SERVICES_KEY: "test-key",
    TDX_TICKETING_APP_ID: 42,
    TDX_ASSET_APP_ID: 10,
    TDX_KB_APP_ID: 20,
  }),
}));
```

## TDX API reference

- Docs: https://solutions.teamdynamix.com/TDWebApi/
- Auth: `POST /api/auth/loginadmin` returns plain text JWT (not JSON)
- All requests: `Authorization: Bearer <token>`, `Content-Type: application/json`
- Tokens expire after 24 hours
- Rate limits vary by endpoint (30-120 calls per 60s depending on endpoint)
- Search returns abbreviated data — use individual GET for full details

## Files not to recreate

`biome.json` and `.pre-commit-config.yaml` already exist and are configured. Do not recreate them.
