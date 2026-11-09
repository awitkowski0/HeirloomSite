import { ATTRIBUTION } from '@/lib/catalog-tools';
import { SITE_URL } from '@/lib/seo';

export const dynamic = 'force-static';

/* The plain-text front door for AI agents. */
export function GET() {
  const body = `# Heirloom Cribs & More

> A virtual catalog of solid hardwood cribs and nursery furniture made to order by independent builders.

${ATTRIBUTION}

Prices are starting prices in US dollars. Lead times are estimates confirmed at order. Agents can research and compare, but orders are placed by a person on the site.

## For agents

- [Full catalog (JSON)](${SITE_URL}/agent/catalog): every browsable piece with price, builder, lead time, style, and builder statements
- [Compare pieces (JSON)](${SITE_URL}/agent/compare?slugs=mission,hudson): two or three product slugs, comma-separated
- [MCP endpoint](${SITE_URL}/agent/mcp): read-only Model Context Protocol tools, search_catalog and compare_pieces, over HTTP POST
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
