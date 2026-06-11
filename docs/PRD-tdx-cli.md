# TDX CLI — Product Requirements Document

**Status:** Draft  
**Date:** 2026-06-09  
**Scope:** CLI rewrite + Agent Skill + library-first architecture

---

## Background

The current codebase is an MCP server that exposes 13 TeamDynamix operations over stdio transport. It uses:
- **Bun** runtime with `bun:test`
- **Admin auth** (`POST /auth/loginadmin` with BEID + WebServicesKey)
- A monolithic entry point (`src/index.ts` → `src/server.ts`)

This PRD reorients the project toward a **CLI-first, library-first design** targeting AI coding agents (Claude Code, GitHub Copilot Coding Agent) as primary consumers.

---

## Goals

1. **CLI tool** (`tdx`) usable by AI agents and humans via shell
2. **Agent Skill** distribution mechanism — a self-describing stub agents can install that always surfaces up-to-date usage docs
3. **User-scoped SSO auth** — per-user credentials, not a shared service account
4. **Node.js + Vitest** runtime — drop Bun for ecosystem compatibility and long-term maintainability
5. **Library-first architecture** — `@tdx/core` holds all business logic; CLI and a future MCP wrapper are thin interfaces over it

---

## Non-Goals (this iteration)

- MCP wrapper (defined here, deferred to a follow-on epic)
- Web API / HTTP transport
- Role-based access control or multi-tenant scoping
- Automated token rotation via external secret manager

---

## Architecture

### Package structure

```
tdx/
├── packages/
│   ├── core/          # @tdx/core — API client, auth, all domain operations, Zod schemas
│   ├── cli/           # tdx CLI — thin Commander.js wrapper over @tdx/core
│   └── mcp/           # (future) MCP server — thin @modelcontextprotocol/server wrapper over @tdx/core
├── package.json       # workspace root
└── vitest.config.ts
```

The **core** package is the source of truth for:
- Auth logic (token fetch, cache, refresh, invalidation)
- Rate limiter (per-endpoint sliding window)
- `tdxRequest()` API client
- All domain operations (tickets, assets, KB, people, applications) as plain async functions
- All Zod input/output schemas

The **CLI** package contains only:
- Commander.js command definitions
- Output formatting (JSON or human-readable table)
- Auth credential persistence (`~/.config/tdx/credentials.json` or OS keychain)
- Skill distribution (`tdx skill`, `tdx install-skill`)

---

## Epic 1 — Node.js + Vitest Migration

**Context:** Bun's `mock.module` leaks across test files in the same process, requiring the unit/QA split as a workaround. Node.js + Vitest eliminates this. The migration is mechanical.

### Issue 1.1 — Replace test runtime: `bun:test` → Vitest

**User story:** As a maintainer, I can run `npm test` and have all tests execute under Vitest so the project is compatible with standard Node.js CI environments.

**Acceptance criteria:**
- All `import { ... } from "bun:test"` changed to `import { ... } from "vitest"`
- `mock.module(...)` → `vi.mock(..., factory)` with async factory pattern
- `mock()` spy → `vi.fn()`
- `vitest.config.ts` added at workspace root with `globals: true`, separate projects for unit and QA
- `bun test` in `package.json` scripts replaced with `vitest run`
- The unit/QA process-separation workaround is removed (Vitest handles module isolation per test file natively)
- All existing tests pass

**Files:** `tests/**/*.test.ts`, `package.json`, new `vitest.config.ts`

---

### Issue 1.2 — Replace Bun runtime with Node.js + tsx

**User story:** As a developer, I can run the project with `node` (via `tsx`) so no Bun installation is required.

**Acceptance criteria:**
- `tsx` added as dev dependency for TypeScript execution
- `dotenv/config` loaded at entry point (Bun auto-loads `.env`; Node does not)
- `@types/bun` removed, `@types/node` added
- `bunfig.toml` removed or emptied
- `README.md` updated: all `bun <cmd>` references updated to `node`/`npm` equivalents
- `bun.lock` replaced with `package-lock.json` (or `pnpm-lock.yaml` if workspace uses pnpm)

**Files:** `package.json`, `src/index.ts`, `bunfig.toml`, `README.md`

---

## Epic 2 — Library-First Refactor

**Context:** The current code mixes MCP concerns (tool registration, `CallToolResult`) with domain logic. The refactor extracts all domain logic into `@tdx/core` so it can be reused by CLI and MCP without duplication.

### Issue 2.1 — Initialize monorepo workspace

**User story:** As a developer, I can run `npm install` at the repo root and have all packages linked so imports between them resolve correctly.

**Acceptance criteria:**
- `package.json` at root configured with `"workspaces": ["packages/*"]`
- `packages/core/package.json` exists with name `@tdx/core`, `"exports"` pointing to built or tsx-executed source
- `packages/cli/package.json` exists with name `tdx`, `"bin": { "tdx": "dist/index.js" }`
- `packages/mcp/` directory scaffolded with a README stub only (not implemented this iteration)
- TypeScript project references wired (`tsconfig.json` at root, per-package `tsconfig.json`)

---

### Issue 2.2 — Extract core: auth, API client, rate limiter

**User story:** As a library consumer, I can import `getAuthToken`, `tdxRequest`, and the rate limiter from `@tdx/core` without pulling in any CLI or MCP dependencies.

**Acceptance criteria:**
- `packages/core/src/auth/client.ts` — `getAuthToken()`, `clearAuthToken()` (from TODO item 2)
- `packages/core/src/api/client.ts` — `tdxRequest()`, `TdxApiError`; calls `clearAuthToken()` on 401
- `packages/core/src/api/rate-limiter.ts` — unchanged from current
- `packages/core/src/config.ts` — `getConfig()` with updated schema (see Epic 3 for auth credential changes)
- No MCP, Commander, or output-formatting imports anywhere in core
- All existing unit tests for these modules pass against the new paths

---

### Issue 2.3 — Extract core: domain operations

**User story:** As a library consumer, I can call domain functions (e.g. `ticketsSearch(args)`) and get back plain typed data objects, not MCP `CallToolResult` structures.

**Acceptance criteria:**
- All tool handlers in `src/tools/*.ts` moved to `packages/core/src/operations/*.ts`
- Return type changes from `Promise<CallToolResult>` to `Promise<unknown>` (raw TDX response)
- `safeToolCall()` and `textResult()` removed from core — these are MCP concerns
- Zod input schemas in `src/tools/schemas/*.ts` moved to `packages/core/src/schemas/*.ts` and re-exported from the core index
- `packages/core/src/index.ts` exports all operations and schemas
- All existing unit tests updated to assert on raw response shape, not `CallToolResult` shape

---

### Issue 2.4 — Rebuild MCP server as thin wrapper over @tdx/core

**User story:** As an MCP consumer, the existing 13 tools continue to work after the refactor, with no behavioral changes.

**Acceptance criteria:**
- `packages/mcp/src/server.ts` re-registers all 13 tools using `@tdx/core` operations
- Tool descriptions and Zod schemas match the original
- `safeToolCall()` and `textResult()` re-implemented locally in `packages/mcp/src/utils.ts`
- QA tests migrated to `packages/mcp/tests/qa/` and pass

---

## Epic 3 — User-Scoped SSO Auth

**Context:** The current design uses a single shared service account (BEID + WebServicesKey) stored in environment variables. This means all operations are attributed to the service account in TDX audit logs and users cannot be authorized individually. The new design stores a per-user JWT obtained via the user's own TDX credentials.

TDX supports `POST /api/auth` with `{ username, password }` for user-level auth (distinct from `POST /api/auth/loginadmin`). Tokens expire after 24 hours. The user authenticates once and the token is cached locally.

### Issue 3.1 — User-facing auth commands

**User story:** As a user, I can run `tdx auth login` to authenticate with my TDX SSO credentials and `tdx auth logout` to revoke the stored token, so I do not need to set environment variables.

**Acceptance criteria:**
- `tdx auth login` prompts interactively for username and password (or accepts `--username`/`--password` flags for non-interactive use)
- On success, token and expiry written to `~/.config/tdx/credentials.json` (mode `0600`)
- `tdx auth logout` deletes or zeroes the credentials file
- `tdx auth status` prints the authenticated username, token expiry, and whether the token is still valid
- All three commands implemented in `packages/cli/src/commands/auth.ts`

---

### Issue 3.2 — Credential resolution in core

**User story:** As a library consumer, `getAuthToken()` automatically finds a valid token — from the credentials file, from environment variables, or by throwing a clear error — without the caller needing to know the source.

**Acceptance criteria:**
- `getAuthToken()` in `@tdx/core` checks in order:
  1. In-process cache (existing behavior)
  2. `TDX_TOKEN` environment variable (for CI/automation)
  3. `~/.config/tdx/credentials.json`
- If no valid token is found, throws `AuthError` with message: `"Not authenticated. Run 'tdx auth login' or set TDX_TOKEN."`
- `TDX_USERNAME` / `TDX_PASSWORD` env vars can trigger a headless login (for service account scenarios)
- `getConfig()` schema updated: `TDX_BEID` and `TDX_WEB_SERVICES_KEY` removed; `TDX_USERNAME`, `TDX_PASSWORD`, and `TDX_TOKEN` are now optional (only required when credential file is absent)
- 401 from TDX API clears the in-process cache and the credentials file entry (calls `clearAuthToken()`)
- Auth unit tests updated for all resolution paths

---

### Issue 3.3 — Secure credential storage

**User story:** As a security-conscious user, my credentials file cannot be read by other OS users, and the CLI warns me if permissions are wrong.

**Acceptance criteria:**
- Credentials file written with `fs.chmod(path, 0o600)` immediately after write
- On startup, if credentials file exists with permissions wider than `0o600`, CLI prints a warning but continues
- Token is stored as `{ token: string, expiresAt: number, username: string }`; password is never persisted

---

## Epic 4 — CLI Interface

**Context:** The CLI is the primary interface for AI agents. Agents execute shell commands and read stdout. Output must be machine-readable by default (JSON), with an optional `--human` flag for human-friendly formatting.

### Issue 4.1 — CLI scaffolding and global flags

**User story:** As an AI agent, I can run `tdx --help` and receive a list of all available commands and global flags.

**Acceptance criteria:**
- `packages/cli/src/index.ts` uses Commander.js
- Global flags: `--json` (default), `--human`, `--base-url <url>`, `--app-id <id>` (override ticketing app)
- `tdx --version` prints the package version
- `tdx --help` lists all command groups: `auth`, `tickets`, `assets`, `kb`, `people`, `apps`, `skill`
- Non-zero exit code on error; error message on stderr; no stack traces unless `DEBUG=tdx` is set

---

### Issue 4.2 — Tickets commands

**User story:** As an AI agent, I can search, get, create, update, and comment on tickets from the command line.

**Acceptance criteria:**

| Command | Maps to |
|---|---|
| `tdx tickets search [options]` | `ticketsSearch()` |
| `tdx tickets get <id>` | `ticketsGet()` |
| `tdx tickets create [options]` | `ticketsCreate()` |
| `tdx tickets update <id> --patch <json>` | `ticketsUpdate()` |
| `tdx tickets feed <id>` | `ticketsFeedGet()` |
| `tdx tickets comment <id> --body <text>` | `ticketsFeedPost()` |

- All search flags map 1:1 to the existing Zod schema fields (forwarded via `camelCase` CLI flags)
- `--patch` accepts a JSON string or `@file.json` for file input
- Output is JSON by default; `--human` renders a table
- Zod validation errors surface on stderr with field names

---

### Issue 4.3 — Assets commands

**User story:** As an AI agent, I can search and retrieve asset/CI records from the command line.

**Acceptance criteria:**

| Command | Maps to |
|---|---|
| `tdx assets search [options]` | `assetsSearch()` |
| `tdx assets get <id>` | `assetsGet()` |

---

### Issue 4.4 — Knowledge Base commands

**User story:** As an AI agent, I can search and retrieve KB articles from the command line.

**Acceptance criteria:**

| Command | Maps to |
|---|---|
| `tdx kb search [options]` | `kbSearch()` |
| `tdx kb get <id>` | `kbGet()` |

---

### Issue 4.5 — People commands

**User story:** As an AI agent, I can search and retrieve person records from the command line.

**Acceptance criteria:**

| Command | Maps to |
|---|---|
| `tdx people search [options]` | `peopleSearch()` |
| `tdx people get <uid>` | `peopleGet()` |

---

### Issue 4.6 — Applications command

**User story:** As an AI agent, I can list all TDX applications to discover App IDs.

**Acceptance criteria:**

| Command | Maps to |
|---|---|
| `tdx apps list` | `applicationsList()` |

---

### Issue 4.7 — Global error handling and exit codes

**User story:** As an AI agent, a failed command exits non-zero with a JSON error object on stderr so I can parse the failure reason.

**Acceptance criteria:**
- Exit 0: success
- Exit 1: generic/unexpected error
- Exit 2: validation error (bad CLI flags)
- Exit 3: auth error (not authenticated or token expired)
- Exit 4: TDX API error (includes HTTP status in the JSON error object)
- Stderr JSON format: `{ "error": "...", "code": "AUTH_ERROR" | "API_ERROR" | "VALIDATION_ERROR" }`

---

## Epic 5 — Agent Skill Distribution

**Context:** AI coding agents (Claude Code, GitHub Copilot) can be taught how to use tools via "skill" files — Markdown documents that describe available commands, flags, and usage patterns. The skill should always reflect the installed CLI version without requiring agents to re-read static documentation. The design here is modeled after Vercel's agent skill pattern: the installed stub is a tiny pointer; the live skill content is served by the CLI itself.

### Issue 5.1 — `tdx skill` command (skill content server)

**User story:** As an AI agent, I can run `tdx skill` to get the complete, up-to-date usage documentation for the TDX CLI in Markdown format, always matching the installed version.

**Acceptance criteria:**
- `tdx skill` prints a Markdown document to stdout containing:
  - A brief description of TDX CLI and what it does
  - Auth setup instructions (`tdx auth login`)
  - All command groups with flags and example invocations
  - Output format documentation (JSON schema shape for each command group)
  - Exit code reference
- The Markdown content is embedded in the CLI binary at build time (not fetched remotely)
- Content version matches `tdx --version`

---

### Issue 5.2 — `tdx install-skill` command (stub installer)

**User story:** As a developer setting up an AI agent workspace, I can run `tdx install-skill [--agent <name>]` to write a skill stub into the appropriate location so the agent knows to call `tdx skill` for full instructions.

**Acceptance criteria:**
- `--agent claude` (default): writes to `.claude/commands/tdx.md` in the current directory
- `--agent copilot`: writes to `.github/copilot-instructions.md` (appends a TDX section if file exists)
- The stub content is:

  ```markdown
  # TDX CLI

  TeamDynamix CLI is installed. To get the latest usage instructions for all commands, run:

  ```
  tdx skill
  ```

  Run this before attempting any TDX operations.
  ```

- `--dry-run` flag prints the content and target path without writing
- Warns (but does not fail) if the target file already contains a TDX section
- `--force` overwrites without warning

---

### Issue 5.3 — Skill content coverage and accuracy

**User story:** As an AI agent reading `tdx skill`, I have enough information to invoke any command correctly without additional context.

**Acceptance criteria:**
- Skill document includes at least one example per command
- All flags visible in `--help` are documented in the skill document
- Auth flow (login, token expiry, `TDX_TOKEN` env var) is covered
- JSON output shape for `tdx tickets get` and `tdx tickets search` is documented with field names
- Skill document tested: run `tdx skill` output through a Markdown linter in CI

---

## Epic 6 — Future: MCP Wrapper (Scoped, Not Implemented This Iteration)

This epic is defined here for planning purposes. Implementation is deferred.

**Goal:** Re-expose all `@tdx/core` operations as an MCP server so MCP-capable hosts (Claude Desktop, VS Code Copilot with MCP) can use TDX without the CLI.

**Design constraints (carry forward):**
- MCP package is a thin wrapper — all domain logic stays in `@tdx/core`
- Auth model: the MCP server runs with a single user's stored credentials (same credential file as CLI), not a service account
- PATCH still uses JSON Patch (RFC 6902) — this is a TDX API requirement, not an MCP choice
- Error sanitization: `TdxApiError` still exposes only HTTP status to MCP consumers, not raw bodies

**Completed MCP package work:**
- MCP server package implemented as wrapper over `@tdx/core`
- QA tests ported from root `tests/qa/` to `packages/mcp/tests/qa/`
- Stdio transport and graceful shutdown wired in `packages/mcp/src/index.ts`

**Issues to file when ready:**
- `mcp: Add install instructions for Claude Desktop and VS Code`

---

## Technical Requirements

### Runtime
- Node.js ≥ 20 (LTS)
- TypeScript strict mode (`"strict": true`)
- ESM modules (`"type": "module"`)

### Dependencies to keep
- `zod` — input validation and schema definitions
- `@modelcontextprotocol/server` — moved to `packages/mcp/`, not in core or CLI

### Dependencies to add
- `commander` — CLI argument parsing
- `tsx` — TypeScript execution for development
- `vitest` — test runner
- `dotenv` — env file loading (or `dotenv/config` import)

### Dependencies to remove
- `@types/bun`
- `@cfworker/json-schema` (Zod handles schema validation)
- `@modelcontextprotocol/server` from root (move to mcp package only)

### Testing strategy
- Unit tests in each package under `packages/*/tests/`
- Vitest workspace config at root, one project per package
- QA / integration tests for MCP server remain in `packages/mcp/tests/qa/`
- CLI integration tests: spawn `tdx` subprocess, assert stdout/exit code
- Auth tests: mock credentials file with `tmp` directory fixture

### CI
- `npm test` runs all packages
- Lint: Biome (unchanged)
- Pre-commit: unchanged (`.pre-commit-config.yaml` already configured)

---

## Migration Order

The epics are sequenced to minimize integration risk:

1. **Epic 1** (Node.js + Vitest) — No architecture change; just tooling. Establishes green baseline.
2. **Epic 2** (Library refactor) — Repackage without changing behavior; existing MCP tests validate correctness.
3. **Epic 3** (SSO auth) — Swap auth mechanism in core; update tests.
4. **Epic 4** (CLI) — New interface, no changes to core.
5. **Epic 5** (Agent Skill) — Additive; no changes to core or CLI command logic.
6. **Epic 6** (MCP) — Future iteration; core is already ready.

---

## Open Questions

| # | Question | Owner | Decision needed by |
|---|---|---|---|
| 1 | Does TDX support OAuth device flow, or is username/password the only user-scoped option? | Engineering | Before Epic 3 |
| 2 | Should `TDX_APP_ID` defaults (ticketing, asset, KB) live in the credentials file or remain env-only? | Engineering | Before Epic 4 |
| 3 | Package manager for monorepo — npm workspaces, pnpm, or yarn? | Engineering | Before Epic 2 |
| 4 | Is OS keychain integration (e.g. `keytar`) in scope for credential storage, or is a `chmod 0600` file sufficient? | Product | Before Epic 3 |
| 5 | CLI distribution — npm publish, GitHub Releases binary, or internal registry? | Product | Before Epic 4 |
