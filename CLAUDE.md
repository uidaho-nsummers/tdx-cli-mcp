# TDX MCP Server

MCP server wrapping the TeamDynamix Web API. Node.js runtime (tsx for TypeScript execution), TypeScript strict mode, Zod validation, Biome formatting.

## Commands

- `npm start` — Start the MCP server (stdio transport); `npm run dev` for watch mode
- `npm test` — Run all tests (Vitest)
- `npm run test:watch` — Run tests in watch mode
- `npm run typecheck` — Type-check with tsc
- `npx biome check --write src/ tests/ packages/` — Format and lint

## Runtime

Use Node.js v26.3+ with tsx, not Bun. Node does not auto-load `.env` — the entry point imports `dotenv/config` first.

- `npx tsx <file>` not `bun <file>`
- `npm install` / `npm ci` not `bun install`
- `npx <pkg>` not `bunx <pkg>`
- Use npm workspaces from the repository root. Do not use pnpm, yarn, or Bun for workspace operations.

## Architecture

The repo is an npm monorepo. The MCP implementation now lives in `packages/mcp` as a thin wrapper over `@tdx/core`.

- `package.json` — Workspace root with `"workspaces": ["packages/*"]`
- `tsconfig.json` — Solution-style TypeScript project references
- `tsconfig.root.json` — Current root MCP source and tests
- `tsconfig.base.json` — Shared compiler options
- `packages/core/` — `@tdx/core`: shared config, auth, API client, rate limiter, **domain operations** (`operations/*.ts`), and **Zod input schemas** (`schemas/*.ts`)
- `packages/cli/` — `tdx` scaffold for the future CLI; package metadata includes `bin.tdx = dist/index.js`
- `packages/mcp/` — `@tdx/mcp`: MCP server package, stdio entrypoint, tool registration, MCP utilities, and QA tests
- `packages/mcp/src/index.ts` — Entry point, stdio transport, graceful shutdown
- `packages/mcp/src/server.ts` — MCP server, registers 13 tools via `createServer()`; imports operations + schemas from `@tdx/core`
- `src/index.ts` — Compatibility entrypoint delegating to `packages/mcp`
- `src/server.ts` — Compatibility re-export from `packages/mcp`
- `src/config.ts` — Lazy-loaded Zod-validated env config (`getConfig()`)
- `src/auth/client.ts` — `getAuthToken()` with JWT cache + proactive refresh
- `src/api/client.ts` — `tdxRequest()` fetch wrapper with auth, retry on 429
- `src/api/rate-limiter.ts` — Client-side sliding window, per-endpoint limits
- `packages/core/src/operations/*.ts` — Domain operations, one file per domain, return raw TDX data (`Promise<unknown>`)
- `packages/core/src/schemas/*.ts` — Zod input schemas per operation
- `packages/mcp/src/utils.ts` — `safeToolCall()` error wrapper, `textResult()` helper (MCP-only)
- `src/tools/utils.ts` — Compatibility re-export from `packages/mcp`

## Key design decisions

- **Config is lazy.** `getConfig()` validates on first call, not at import time. This allows tests to mock config before it loads.
- **No rate limit headers.** TDX doesn't return `X-RateLimit-*` headers. Limits are tracked client-side with per-endpoint configs in `rate-limiter.ts`.
- **No cursor pagination.** TDX search uses `MaxResults`/`ReturnCount` in request body, not page indexes. Use date ranges for windowing.
- **PATCH uses JSON Patch (RFC 6902)**, not JSON Merge Patch. The `ticketUpdateInputSchema` accepts a `patches` array with `op`/`path`/`value`.
- **Error sanitization.** `safeToolCall()` catches `TdxApiError` and returns only the HTTP status — raw error bodies are never exposed to MCP consumers. It wraps `textResult(await operation(args))` in `packages/mcp/src/server.ts`; operations themselves return raw data and contain no MCP concerns.
- **UID fields use `.uuid()` validation** to prevent path injection via string-typed IDs.
- **Workspace scaffold in progress.** Domain operations and schemas now live in `@tdx/core`; root `src/` remains the source of truth for the working MCP server until it is rebuilt as a thin package wrapper.
- **TypeScript references.** Keep package-level `tsconfig.json` files wired through the root solution config; `packages/cli` references `packages/core`.

## Testing

Tests use Vitest. Vitest isolates module mocks per file natively, so unit and QA tests run together in a single `vitest run`.

- `tests/` — Unit tests, mirror `src/` structure
- `tests/operations/` — `@tdx/core` domain operation + schema tests (assert raw response shape)
- `packages/mcp/tests/qa/` — End-to-end MCP server tests with in-memory transport
- `packages/mcp/tests/fixtures/` — Realistic TDX API response data for MCP QA tests
- `tests/setup.ts` — Registers custom `toBeArray()`/`toBeString()` matchers

When unit-testing core operations, mock the core API client and config modules the operation imports, and assert on the raw return value:

```ts
vi.mock("../../packages/core/src/api/client.ts", () => ({
  tdxRequest: mockTdxRequest,
}));

vi.mock("../../packages/core/src/config.ts", () => ({
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

The `tests/server.test.ts` integration test partially mocks `@tdx/core` via `vi.importActual`, keeping the real operations and schemas while stubbing `getConfig`/`tdxRequest`/auth.

## TDX API reference

- Docs: https://solutions.teamdynamix.com/TDWebApi/
- Auth: `POST /api/auth/loginadmin` returns plain text JWT (not JSON)
- All requests: `Authorization: Bearer <token>`, `Content-Type: application/json`
- Tokens expire after 24 hours
- Rate limits vary by endpoint (30-120 calls per 60s depending on endpoint)
- Search returns abbreviated data — use individual GET for full details

## Files not to recreate

`biome.json` and `.pre-commit-config.yaml` already exist and are configured. Do not recreate them.
