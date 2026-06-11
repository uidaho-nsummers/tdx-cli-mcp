# TDX MCP Server

An MCP (Model Context Protocol) server that wraps the [TeamDynamix Web API](https://solutions.teamdynamix.com/TDWebApi/), enabling AI assistants to search tickets, manage assets, query the knowledge base, and look up people in your TDX instance.

## Quickstart

### Prerequisites

- [Node.js](https://nodejs.org) v26.3+ (with npm)
- A TeamDynamix instance with Web API access
- Admin service account credentials (BEID + Web Services Key)

### 1. Install dependencies

```sh
npm install
```

### 2. Configure environment

```sh
cp .env.example .env
```

Edit `.env` with your TDX instance details:

```sh
TDX_BASE_URL=https://yourinstance.teamdynamix.com/TDWebApi/api
TDX_BEID=your-admin-beid-guid
TDX_WEB_SERVICES_KEY=your-web-services-key-guid
TDX_TICKETING_APP_ID=123
TDX_ASSET_APP_ID=456
TDX_KB_APP_ID=789
```

**Finding your App IDs:** If you don't know your application IDs, you can discover them after setup using the `tdx_applications_list` tool, or by calling `GET /api/applications` on your TDX instance directly.

### 3. Run the server

```sh
npm start
```

(Equivalent to `npx tsx packages/mcp/src/index.ts` — [tsx](https://tsx.is) executes TypeScript directly under Node.js.)

The server communicates over stdio using the MCP protocol. It's designed to be launched by an MCP client (like Claude Desktop or Claude Code), not run standalone.

### 4. Connect to an MCP client

**Claude Desktop** (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "tdx": {
      "command": "npx",
      "args": ["-y", "tsx", "/absolute/path/to/packages/mcp/src/index.ts"],
      "env": {
        "TDX_BASE_URL": "https://yourinstance.teamdynamix.com/TDWebApi/api",
        "TDX_BEID": "your-beid",
        "TDX_WEB_SERVICES_KEY": "your-key",
        "TDX_TICKETING_APP_ID": "123",
        "TDX_ASSET_APP_ID": "456",
        "TDX_KB_APP_ID": "789"
      }
    }
  }
}
```

**Claude Code** (`.claude/settings.json`):

```json
{
  "mcpServers": {
    "tdx": {
      "command": "npx",
      "args": ["-y", "tsx", "/absolute/path/to/packages/mcp/src/index.ts"]
    }
  }
}
```

When using Claude Code, place your credentials in `.env` at the project root (it's gitignored). Note: `dotenv/config` loads `.env` from the current working directory; if the server is launched from elsewhere, set `DOTENV_CONFIG_PATH=/absolute/path/to/.env` (or configure the client to run with the repo as its working directory).

## Running tests

```sh
# All tests (unit + QA)
npm test

# Watch mode
npm run test:watch
```

Tests run under Vitest, which isolates module mocks per file natively.

## Workspace scaffold

This repository uses npm workspaces for the planned library-first refactor:

- `packages/core` — `@tdx/core`, shared TeamDynamix config, auth, API client, and rate-limit logic
- `packages/cli` — `tdx`, reserved for the future command-line interface
- `packages/mcp` — `@tdx/mcp`, thin MCP wrapper over `@tdx/core`

The MCP server implementation lives in `packages/mcp`. Root `src/` keeps compatibility entrypoints that delegate to the package source.

## Project structure

```
packages/
  core/
    package.json        # @tdx/core workspace package scaffold
    src/index.ts        # Core public API entrypoint
    src/config.ts       # Env var loading with Zod validation
    src/auth/client.ts  # TDX auth - JWT caching, proactive refresh
    src/api/client.ts   # Fetch wrapper - auth headers, retry on 429
    src/api/rate-limiter.ts # Client-side sliding window rate limiter
    src/operations/     # Domain operations returning raw TDX data
    src/schemas/        # Zod input schemas for each operation
    tsconfig.json       # TypeScript project reference target
  cli/
    package.json        # tdx workspace package scaffold with bin metadata
    src/index.ts        # Minimal CLI entrypoint placeholder
    tsconfig.json       # References @tdx/core
  mcp/
    package.json        # @tdx/mcp workspace package metadata
    src/index.ts        # Entry point — stdio transport, graceful shutdown
    src/server.ts       # MCP server — tool registration
    src/utils.ts        # safeToolCall error wrapper + textResult helper
    tests/qa/           # End-to-end MCP server tests
src/
  index.ts              # Compatibility entrypoint delegating to packages/mcp
  server.ts             # Compatibility re-export from packages/mcp
  config.ts             # Transitional re-export from @tdx/core
  auth/
    client.ts           # Transitional re-export from @tdx/core
    schemas.ts          # Auth Zod schemas
  api/
    client.ts           # Transitional re-export from @tdx/core
    rate-limiter.ts     # Transitional re-export from @tdx/core
  tools/
    utils.ts            # Compatibility re-export from packages/mcp
tests/
  config.test.ts        # Config loading tests
  auth/                 # Auth client tests
  api/                  # API client + rate limiter + error scenario tests
  operations/           # Core domain operation + schema tests
tsconfig.json           # Solution-style TypeScript project references
tsconfig.root.json      # Transitional root source and shared tests
tsconfig.base.json      # Shared compiler options
```

## Authentication

The server uses TDX admin authentication (`POST /api/auth/loginadmin`) with BEID and Web Services Key. The JWT is cached in memory and refreshed automatically 5 minutes before expiry (tokens last 24 hours).

## Rate limiting

TDX enforces per-endpoint rate limits with no response headers. The server tracks limits client-side using a sliding window algorithm. Limits vary by endpoint:

| Endpoint | Limit |
|---|---|
| Ticket search | 30 / 60s |
| Ticket create | 120 / 60s |
| People CRUD | 45 / 60s |
| People lookup | 75 / 10s |
| Most others | 60 / 60s |

On 429 responses, the server retries up to 3 times with backoff.

## Tech stack

- **Runtime:** Node.js (v26.3+) executed via tsx
- **Language:** TypeScript (strict mode)
- **MCP SDK:** @modelcontextprotocol/server
- **Validation:** Zod
- **Linting/Formatting:** Biome
- **Testing:** Vitest
