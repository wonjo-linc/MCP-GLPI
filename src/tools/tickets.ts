import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GlpiClient } from '../glpi/client';

export function registerTicketTools(server: McpServer, glpi: GlpiClient) {
  server.tool(
    'list_tickets',
    'List tickets from GLPI with optional filtering',
    {
      range: z.string().optional().describe('Range of results, e.g. "0-9" for first 10'),
      order: z.enum(['ASC', 'DESC']).optional().describe('Sort order'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async (args) => {
      await glpi.initSession();
      try {
        const tickets = await glpi.getItems('Ticket', {
          range: args.range || '0-24',
          order: args.order || 'DESC',
        });
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(tickets, null, 2) }],
        };
      } finally {
        await glpi.killSession();
      }
    },
  );

  server.tool(
    'get_ticket',
    'Get detailed information about a specific GLPI ticket',
    {
      id: z.number().describe('The ticket ID'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async (args) => {
      await glpi.initSession();
      try {
        const ticket = await glpi.getItem('Ticket', args.id);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(ticket, null, 2) }],
        };
      } finally {
        await glpi.killSession();
      }
    },
  );

  server.tool(
    'create_ticket',
    'Create a new ticket in GLPI',
    {
      name: z.string().describe('Ticket title'),
      content: z.string().describe('Ticket description'),
      type: z.number().min(1).max(2).optional().describe('1=Incident, 2=Request'),
      urgency: z.number().min(1).max(5).optional().describe('Urgency level (1-5)'),
      priority: z.number().min(1).max(6).optional().describe('Priority level (1-6)'),
    },
    { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    async (args) => {
      await glpi.initSession();
      try {
        const result = await glpi.createItem('Ticket', {
          name: args.name,
          content: args.content,
          type: args.type || 1,
          urgency: args.urgency || 3,
          priority: args.priority || 3,
        });
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        };
      } finally {
        await glpi.killSession();
      }
    },
  );

  server.tool(
    'update_ticket',
    'Update an existing GLPI ticket',
    {
      id: z.number().describe('The ticket ID to update'),
      name: z.string().optional().describe('New ticket title'),
      content: z.string().optional().describe('New ticket description'),
      status: z.number().min(1).max(6).optional().describe('Status (1=New, 2=Assigned, 3=Planned, 4=Pending, 5=Solved, 6=Closed)'),
      urgency: z.number().min(1).max(5).optional().describe('Urgency level (1-5)'),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (args) => {
      const { id, ...updateData } = args;
      const filtered = Object.fromEntries(
        Object.entries(updateData).filter(([, v]) => v !== undefined),
      );

      await glpi.initSession();
      try {
        const result = await glpi.updateItem('Ticket', id, filtered);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        };
      } finally {
        await glpi.killSession();
      }
    },
  );

  server.tool(
    'search_tickets',
    'Search tickets in GLPI using criteria',
    {
      query: z.string().describe('Search query string'),
    },
    { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    async (args) => {
      await glpi.initSession();
      try {
        const results = await glpi.searchItems('Ticket', [
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
