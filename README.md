# MCP-GLPI

MCP-GLPI is a TypeScript Model Context Protocol (MCP) server for GLPI IT asset management. It exposes GLPI ticket and asset capabilities to MCP clients.

## Runtime modes

### Stdio mode

`src/index.ts` starts the MCP server over stdio. This mode is intended for local MCP clients that launch the server process directly.

Package script reference:

```sh
npm run build
npm start
```

For development, the package also defines:

```sh
npm run dev
```

### HTTP / Streamable HTTP mode

`src/server.ts` starts an Express server using MCP Streamable HTTP transport. It serves MCP requests at `/mcp` and provides a health endpoint at `/health`.

Package script reference:

```sh
npm run build
npm run start:remote
```

For development, the package also defines:

```sh
npm run dev:remote
```

## Configuration

Configure the server with environment variables. Use placeholder values for local development and never paste real token values into documentation, commits, or shared logs.

Required for GLPI access:

- `GLPI_URL`
- `GLPI_APP_TOKEN`
- `GLPI_USER_TOKEN`

HTTP mode can also use:

- `MCP_API_KEY`
- `OAUTH_CLIENT_ID`
- `OAUTH_CLIENT_SECRET`
- `PORT`

Example placeholder-only local configuration:

```env
GLPI_URL=https://glpi.example.invalid
GLPI_APP_TOKEN=replace-with-app-token
GLPI_USER_TOKEN=replace-with-user-token
MCP_API_KEY=replace-with-api-key
OAUTH_CLIENT_ID=replace-with-client-id
OAUTH_CLIENT_SECRET=replace-with-client-secret
PORT=3000
```

## Health check

When running in HTTP / Streamable HTTP mode, check service health with:

```text
GET /health
```

The endpoint returns a JSON status response.

## Safe local development notes

- Keep real credentials in a local `.env` file only.
- Never commit `.env` or real token values.
- Use placeholder values in examples, tests, documentation, and issue comments.
- Review changes before committing to make sure no secrets are included.

## Other package scripts

Additional scripts defined in `package.json`:

```sh
npm run lint
npm run format
npm test
```
