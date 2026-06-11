# TDX MCP Package

Thin MCP wrapper over `@tdx/core`.

This package owns the stdio entrypoint, MCP server tool registration, MCP result formatting, and MCP-facing error sanitization. Domain operations, auth, config, API requests, rate limiting, and Zod input schemas stay in `@tdx/core`.

## Commands

```sh
npm run start --workspace @tdx/mcp
npm run dev --workspace @tdx/mcp
npm run build --workspace @tdx/mcp
```

The root `npm start` and `npm run dev` commands also launch this package's source entrypoint.
