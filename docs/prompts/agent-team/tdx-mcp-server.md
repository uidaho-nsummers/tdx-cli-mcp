# Agent Team Prompt: TDX MCP Server

## Prompt

Build an MCP (Model Context Protocol) server that wraps the TeamDynamix (TDX) Web API, enabling AI assistants to interact with TDX ticketing, assets, knowledge base, and other resources.

Create an agent team with 4 teammates:

1. **Developer** — Implements the MCP server core: transport, auth, tool definitions, and TDX API client. Uses TypeScript in strict mode, Bun as runtime/bundler, Zod for request/response validation, and Biome for linting/formatting.

2. **Test Writer** — Writes comprehensive unit and integration tests using Bun's built-in test runner. Covers auth token lifecycle, tool handlers, Zod schema validation, error paths, rate limit handling, and pagination. Uses fixtures/mocks for the TDX API. Tests should be colocated with source files or in a `__tests__` directory mirroring the source structure.

3. **Security Reviewer** — Audits the codebase for security vulnerabilities: credential handling (JWT storage, secret leakage in logs/errors), input validation, injection risks, rate limit compliance, and safe error messages. Reviews auth flows, environment variable handling, and ensures secrets never appear in tool outputs. Reports findings with severity ratings and fix recommendations. Require plan approval before making changes.

4. **QA / Functional Tester** — Evaluates the MCP server end-to-end: verifies tool definitions conform to the MCP spec, tests tool invocations against realistic TDX API responses, validates error handling and edge cases (expired tokens, 429 responses, malformed input, missing appId). Confirms the server starts, handles stdio transport correctly, and gracefully shuts down.

## Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript (strict mode)
- **Linting/Formatting**: Biome
- **Validation**: Zod
- **Test Runner**: Bun test
- **MCP SDK**: `@modelcontextprotocol/sdk`

## TDX Web API Reference

- Docs: https://rollins.teamdynamix.com/TDWebApi/
- Canonical docs: https://solutions.teamdynamix.com/TDWebApi/
- REST API, JSON only
- Base URL pattern: `https://{instance}.teamdynamix.com/TDWebApi/api/...`
- Existing Python reference library: https://github.com/cedarville-university/tdxlib

### Authentication

Two primary methods:

1. **User login**: `POST /api/auth/login` with `{"username": "...", "password": "..."}` — returns a JWT as plain text
2. **Admin login**: `POST /api/auth/loginadmin` with `{"BEID": "...", "WebServicesKey": "..."}` — for service account access

JWT is passed as `Authorization: Bearer <token>` on all requests. Tokens expire after 24 hours (check `exp` claim). Some endpoints require admin tokens.

### Key Design Requirements

- **appId routing**: Many endpoints (tickets, assets, KB, CMDB) require an `{appId}` path parameter. The server config must support specifying which app IDs map to which TDX applications. Use `GET /api/applications` for discovery.
- **Rate limiting**: 60 calls per endpoint per IP per 60 seconds. Parse `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers. Implement backoff/retry on 429 responses. Buffer 5 seconds for clock skew.
- **Pagination**: Search endpoints use `PageIndex` (0-based) and `PageSize` (max 200). The server should expose pagination params to callers.
- **Partial updates**: Use `PATCH` over `POST` for ticket/asset updates since callers typically update specific fields.
- **Custom attributes**: TDX uses custom attributes extensively. Expose attribute discovery via `/api/{appId}/attributes`.
- **Notification flags**: Ticket create/update endpoints accept query params like `NotifyRequestor`, `NotifyResponsible` — expose these as optional tool parameters.

### Priority MCP Tools to Implement

**Phase 1 — Core:**

- `tdx_auth_login` — Authenticate and cache JWT
- `tdx_tickets_search` — Search tickets with filters
- `tdx_tickets_get` — Get ticket by ID
- `tdx_tickets_create` — Create a new ticket
- `tdx_tickets_update` — Update a ticket (PATCH)
- `tdx_tickets_feed_get` — Get ticket feed/comments
- `tdx_tickets_feed_post` — Post a comment to a ticket

**Phase 2 — Extended:**

- `tdx_assets_search` — Search assets
- `tdx_assets_get` — Get asset by ID
- `tdx_kb_search` — Search knowledge base articles
- `tdx_kb_get` — Get KB article by ID
- `tdx_people_search` — Search people/users
- `tdx_people_get` — Get person by UID
- `tdx_applications_list` — List available applications (for appId discovery)

**Phase 3 — Advanced:**

- `tdx_tickets_create_child` — Create child ticket
- `tdx_assets_create` / `tdx_assets_update` — Asset CRUD
- `tdx_time_entries_create` — Log time entries
- `tdx_reports_get` — Run a saved report

## Project Structure

```sh
tdx-mcp-server/
  src/
    index.ts              # Entry point, stdio transport setup
    server.ts             # MCP server definition, tool registration
    config.ts             # Environment/config loading with Zod schemas
    auth/
      client.ts           # TDX auth client (login, token caching, refresh)
      schemas.ts          # Zod schemas for auth requests/responses
    api/
      client.ts           # Base TDX API client (fetch wrapper, rate limiting, pagination)
      rate-limiter.ts     # Rate limit tracking and backoff logic
    tools/
      tickets.ts          # Ticket tool handlers
      assets.ts           # Asset tool handlers
      kb.ts               # Knowledge base tool handlers
      people.ts           # People tool handlers
      applications.ts     # Applications tool handler
      schemas/            # Zod schemas for each tool's input/output
        tickets.ts
        assets.ts
        kb.ts
        people.ts
        applications.ts
    types/
      tdx.ts              # Shared TDX API types
  tests/
    ...                   # Mirror src/ structure
  biome.json              # Already exists — do not recreate
  .pre-commit-config.yaml # Already exists — prek runs biome check on staged files
  tsconfig.json
  package.json
  bunfig.toml
  .env.example            # Document required env vars (never commit .env)
```

## Configuration (Environment Variables)

```
TDX_BASE_URL=https://rollins.teamdynamix.com/TDWebApi/api
TDX_BEID=<admin BE ID>
TDX_WEB_SERVICES_KEY=<admin web services key>
TDX_TICKETING_APP_ID=<ticketing app ID>
TDX_ASSET_APP_ID=<asset/CI app ID>
TDX_KB_APP_ID=<knowledge base app ID>
```

## Task Breakdown

Have the lead create tasks along these lines, assigning 5-6 per teammate:

**Developer tasks:**

1. Scaffold project: package.json, tsconfig.json (strict), bunfig.toml (biome.json and .pre-commit-config.yaml already exist — do not recreate)
2. Implement config loading with Zod validation
3. Implement auth client with JWT caching and proactive refresh
4. Implement base API client with rate limit tracking and retry
5. Implement Phase 1 ticket tools with Zod schemas
6. Implement MCP server setup and stdio transport
7. Implement Phase 2 tools (assets, KB, people, applications)

**Test Writer tasks:**

1. Write unit tests for config loading (valid/invalid env)
2. Write unit tests for auth client (login, token refresh, expiry)
3. Write unit tests for rate limiter (tracking, backoff, header parsing)
4. Write unit tests for ticket tool handlers (CRUD, search, feed)
5. Write integration tests for the MCP server (tool listing, tool invocation)
6. Write tests for error scenarios (401, 429, 500, malformed responses)

**Security Reviewer tasks:**

1. Review auth flow: credential handling, token storage, secret leakage
2. Review API client: input validation, injection risks, error messages
3. Review config loading: env var handling, default values, secret exposure
4. Review tool outputs: ensure no credentials or sensitive data leak through MCP tool responses
5. Verify Biome config enforces security-relevant lint rules

**QA / Functional Tester tasks:**

1. Validate MCP server starts and responds to `initialize` handshake
2. Validate all tool definitions conform to MCP tool schema spec
3. Test tool invocations with realistic mock TDX API responses
4. Test error handling: expired JWT triggers re-auth, 429 triggers backoff, bad input returns clear errors
5. Test graceful shutdown and cleanup
6. Validate pagination works correctly across multi-page result sets

Wait for all teammates to complete their tasks before synthesizing. The Developer should complete Phase 1 before the QA tester begins functional testing. The Security Reviewer should review code as each phase completes.

---

# Usage

Copy the prompt above (inside the code fence) and paste it into a Claude Code session with agent teams enabled. Make sure your settings include:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

Run with dangerous permissions skipped for autonomous operation, or omit for interactive approval:

```bash
claude --dangerously-skip-permissions
```
