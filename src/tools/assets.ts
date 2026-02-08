import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GlpiClient } from '../glpi/client';
import { GlpiItemType } from '../types/glpi';

const assetTypes = ['Computer', 'Monitor', 'NetworkEquipment', 'Peripheral', 'Phone', 'Printer', 'Software'] as const;

export function registerAssetTools(server: McpServer, glpi: GlpiClient) {
  server.tool(
    'list_assets',
    'List IT assets from GLPI by type',
    {
      type: z.enum(assetTypes).describe('Type of asset to list'),
      range: z.string().optional().describe('Range of results, e.g. "0-9"'),
    },
    async (args) => {
      await glpi.initSession();
      try {
        const items = await glpi.getItems(args.type as GlpiItemType, {
          range: args.range || '0-24',
        });
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(items, null, 2) }],
        };
      } finally {
        await glpi.killSession();
      }
    },
  );

  server.tool(
    'get_asset',
    'Get detailed information about a specific IT asset',
    {
      type: z.enum(assetTypes).describe('Type of asset'),
      id: z.number().describe('The asset ID'),
    },
    async (args) => {
      await glpi.initSession();
      try {
        const item = await glpi.getItem(args.type as GlpiItemType, args.id);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(item, null, 2) }],
        };
      } finally {
        await glpi.killSession();
      }
    },
  );

  server.tool(
    'search_assets',
    'Search IT assets in GLPI',
    {
      type: z.enum(assetTypes).describe('Type of asset to search'),
      query: z.string().describe('Search query string'),
    },
    async (args) => {
      await glpi.initSession();
      try {
        const results = await glpi.searchItems(args.type as GlpiItemType, [
          { field: 1, searchtype: 'contains', value: args.query },
        ]);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
        };
      } finally {
        await glpi.killSession();
      }
    },
  );
}
