import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { GlpiClient } from './glpi/client';
import { registerTicketTools } from './tools/tickets';
import { registerAssetTools } from './tools/assets';

const GLPI_URL = process.env.GLPI_URL;
const GLPI_APP_TOKEN = process.env.GLPI_APP_TOKEN;
const GLPI_USER_TOKEN = process.env.GLPI_USER_TOKEN;

if (!GLPI_URL || !GLPI_APP_TOKEN || !GLPI_USER_TOKEN) {
  console.error('Missing required environment variables:');
  console.error('  GLPI_URL, GLPI_APP_TOKEN, GLPI_USER_TOKEN');
  console.error('Copy .env.example to .env and fill in your values.');
  process.exit(1);
}

const glpi = new GlpiClient(GLPI_URL, GLPI_APP_TOKEN, GLPI_USER_TOKEN);

const server = new McpServer({
  name: 'mcp-glpi',
  version: '1.0.0',
});

registerTicketTools(server, glpi);
registerAssetTools(server, glpi);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GLPI MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
