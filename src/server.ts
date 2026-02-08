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

if (!GLPI_URL || !GLPI_APP_TOKEN || !GLPI_USER_TOKEN) {
  console.error('Missing required environment variables: GLPI_URL, GLPI_APP_TOKEN, GLPI_USER_TOKEN');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

// Simple API key authentication
app.use('/mcp', (req, res, next) => {
  if (MCP_API_KEY) {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${MCP_API_KEY}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  }
  next();
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
