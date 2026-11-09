import { NextResponse } from 'next/server';
import { CATALOG_TOOLS, CatalogToolError, runCatalogTool } from '@/lib/catalog-tools';

export const runtime = 'nodejs';

/*
 * A stateless, read-only Model Context Protocol endpoint so AI agents can search
 * and compare the catalog as tools. It has no write tools and no session.
 */
const reply = (id: unknown, result: unknown) => NextResponse.json({ jsonrpc: '2.0', id, result });
const failure = (id: unknown, code: number, message: string) =>
  NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } });

export async function POST(req: Request) {
  let message: { id?: unknown; method?: unknown; params?: Record<string, unknown> };
  try {
    message = await req.json();
  } catch {
    return failure(null, -32700, 'Parse error');
  }
  const { id, method, params } = message;

  // A JSON-RPC notification has no id and gets no response body.
  if (id === undefined) return new NextResponse(null, { status: 202 });

  switch (method) {
    case 'initialize':
      return reply(id, {
        protocolVersion: params?.protocolVersion ?? '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: { name: 'heirloom-catalog', version: '1.0.0' },
      });
    case 'ping':
      return reply(id, {});
    case 'tools/list':
      return reply(id, {
        tools: CATALOG_TOOLS.map(({ name, description, input_schema }) => ({
          name,
          description,
          inputSchema: input_schema,
          annotations: { readOnlyHint: true },
        })),
      });
    case 'tools/call':
      try {
        const result = runCatalogTool(String(params?.name), (params?.arguments ?? {}) as Record<string, unknown>);
        return reply(id, { content: [{ type: 'text', text: JSON.stringify(result) }] });
      } catch (err) {
        if (err instanceof CatalogToolError) {
          return reply(id, { content: [{ type: 'text', text: err.message }], isError: true });
        }
        throw err;
      }
    default:
      return failure(id, -32601, 'Method not found');
  }
}

export function GET() {
  return new NextResponse(null, { status: 405, headers: { Allow: 'POST' } });
}
