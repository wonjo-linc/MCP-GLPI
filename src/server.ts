import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { GlpiClient } from './glpi/client';
import { registerTicketTools } from './tools/tickets';
import { registerAssetTools } from './tools/assets';

const GLPI_URL = process.env.GLPI_URL;
const GLPI_APP_TOKEN = process.env.GLPI_APP_TOKEN;
const GLPI_USER_TOKEN = process.env.GLPI_USER_TOKEN;
const PORT = parseInt(process.env.PORT || '3000', 10);
const MCP_API_KEY = process.env.MCP_API_KEY;
const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;

if (!GLPI_URL || !GLPI_APP_TOKEN || !GLPI_USER_TOKEN) {
  console.error('Missing required environment variables: GLPI_URL, GLPI_APP_TOKEN, GLPI_USER_TOKEN');
  process.exit(1);
}

const app = express();
app.set('trust proxy', true);
app.use(cors());
app.use(express.json());

// OAuth 2.0 storage
const activeTokens = new Map<string, number>();
const authCodes = new Map<string, { redirectUri: string; codeChallenge?: string; expiresAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [token, expiry] of activeTokens) {
    if (now > expiry) activeTokens.delete(token);
  }
  for (const [code, data] of authCodes) {
    if (now > data.expiresAt) authCodes.delete(code);
  }
}, 60000);

// OAuth 2.0 discovery
app.get('/.well-known/oauth-authorization-server', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    token_endpoint_auth_methods_supported: ['client_secret_post'],
    grant_types_supported: ['authorization_code', 'client_credentials'],
    response_types_supported: ['code'],
    code_challenge_methods_supported: ['S256'],
  });
});

// OAuth 2.0 authorization endpoint
app.get('/authorize', (req, res) => {
  const { client_id, redirect_uri, state, code_challenge } = req.query as Record<string, string>;

  if (client_id !== OAUTH_CLIENT_ID) {
    res.status(400).json({ error: 'invalid_client' });
    return;
  }

  // Auto-approve: generate authorization code and redirect back
  const code = randomUUID();
  authCodes.set(code, {
    redirectUri: redirect_uri,
    codeChallenge: code_challenge,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set('code', code);
  if (state) redirectUrl.searchParams.set('state', state);
  res.redirect(redirectUrl.toString());
});

// OAuth 2.0 token endpoint
app.post('/oauth/token', express.urlencoded({ extended: false }), (req, res) => {
  const { grant_type, client_id, client_secret, code, redirect_uri } = req.body;

  if (!OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET) {
    res.status(500).json({ error: 'server_error' });
    return;
  }

  if (grant_type === 'authorization_code') {
    const authCode = authCodes.get(code);
    if (!authCode || authCode.redirectUri !== redirect_uri) {
      res.status(400).json({ error: 'invalid_grant' });
      return;
    }
    authCodes.delete(code);

    const token = randomUUID();
    const expiresIn = 3600;
    activeTokens.set(token, Date.now() + expiresIn * 1000);

    res.json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: expiresIn,
    });
    return;
  }

  if (grant_type === 'client_credentials') {
    if (client_id !== OAUTH_CLIENT_ID || client_secret !== OAUTH_CLIENT_SECRET) {
      res.status(401).json({ error: 'invalid_client' });
      return;
    }

    const token = randomUUID();
    const expiresIn = 3600;
    activeTokens.set(token, Date.now() + expiresIn * 1000);

    res.json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: expiresIn,
    });
    return;
  }

  res.status(400).json({ error: 'unsupported_grant_type' });
});

// Authentication middleware
app.use('/mcp', (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    // Check OAuth token
    if (activeTokens.has(token) && Date.now() < activeTokens.get(token)!) {
      return next();
    }
    // Check API key
    if (MCP_API_KEY && token === MCP_API_KEY) {
      return next();
    }
  }

  // No auth configured - allow through
  if (!MCP_API_KEY && !OAUTH_CLIENT_ID) {
    return next();
  }

  res.status(401).json({ error: 'Unauthorized' });
});

// Track transports by session ID for stateful connections
const transports = new Map<string, StreamableHTTPServerTransport>();

app.all('/mcp', async (req, res) => {
  try {
    // Handle session-based routing
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (sessionId && transports.has(sessionId)) {
      // Existing session - route to its transport
      const transport = transports.get(sessionId)!;
      await transport.handleRequest(req, res, req.body);
      return;
    }

    if (sessionId && !transports.has(sessionId)) {
      // Unknown session
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // New session - create server + transport
    const glpi = new GlpiClient(GLPI_URL!, GLPI_APP_TOKEN!, GLPI_USER_TOKEN!);
    const server = new McpServer({ name: 'mcp-glpi', version: '1.0.0' });
    registerTicketTools(server, glpi);
    registerAssetTools(server, glpi);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        transports.set(id, transport);
        console.log(`Session created: ${id}`);
      },
    });

    transport.onclose = () => {
      const id = transport.sessionId;
      if (id) {
        transports.delete(id);
        console.log(`Session closed: ${id}`);
      }
    };

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP request error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', sessions: transports.size });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`GLPI MCP Server (HTTP) listening on port ${PORT}`);
  console.log(`MCP endpoint: http://0.0.0.0:${PORT}/mcp`);
  console.log(`Health check: http://0.0.0.0:${PORT}/health`);
});
