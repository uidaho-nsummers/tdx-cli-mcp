# TDX MCP Server

An MCP (Model Context Protocol) server that wraps the [TeamDynamix Web API](https://solutions.teamdynamix.com/TDWebApi/), enabling AI assistants to search tickets, manage assets, query the knowledge base, and look up people in your TDX instance.

## Quickstart

### Prerequisites

- [Bun](https://bun.sh) v1.3+
- A TeamDynamix instance with Web API access
- Admin service account credentials (BEID + Web Services Key)

### 1. Install dependencies

```sh
bun install
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
bun run src/index.ts
```

The server communicates over stdio using the MCP protocol. It's designed to be launched by an MCP client (like Claude Desktop or Claude Code), not run standalone.

### 4. Connect to an MCP client

**Claude Desktop** (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "tdx": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/src/index.ts"],
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
      "command": "bun",
      "args": ["run", "/absolute/path/to/src/index.ts"]
    }
  }
}
```

When using Claude Code, place your credentials in `.env` at the project root (it's gitignored). Bun loads `.env` automatically.

## Running tests

```sh
# All tests (unit + QA)
bun run test

# Unit tests only
bun run test:unit

# QA/integration tests only
bun run test:qa
```

Unit and QA tests run in separate processes to avoid `mock.module` cross-contamination.

## Project structure

```
src/
  index.ts              # Entry point — stdio transport, graceful shutdown
  server.ts             # MCP server — tool registration
  config.ts             # Env var loading with Zod validation
  auth/
    client.ts           # TDX auth — JWT caching, proactive refresh
    schemas.ts          # Auth Zod schemas
  api/
    client.ts           # Fetch wrapper — auth headers, retry on 429
    rate-limiter.ts     # Client-side sliding window rate limiter
  tools/
    tickets.ts          # Ticket tool handlers
    assets.ts           # Asset tool handlers
    kb.ts               # Knowledge base tool handlers
    people.ts           # People tool handlers
    applications.ts     # Applications tool handler
    utils.ts            # safeToolCall error wrapper
    schemas/            # Zod input schemas for each tool
tests/
  config.test.ts        # Config loading tests
  server.test.ts        # Server creation tests
  auth/                 # Auth client tests
  api/                  # API client + rate limiter + error scenario tests
  tools/                # Tool handler tests
  qa/                   # End-to-end MCP server tests
  fixtures/             # Realistic TDX API response fixtures
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

- **Runtime:** Bun
- **Language:** TypeScript (strict mode)
- **MCP SDK:** @modelcontextprotocol/server
- **Validation:** Zod
- **Linting/Formatting:** Biome
- **Testing:** bun:test
