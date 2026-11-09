import { NextResponse } from 'next/server';
import { CatalogToolError, runCatalogTool } from '@/lib/catalog-tools';

export const runtime = 'nodejs';

/* GET /agent/compare?slugs=mission,hudson - two or three pieces side by side. */
export function GET(req: Request) {
  const slugs = (new URL(req.url).searchParams.get('slugs') ?? '').split(',').filter(Boolean);
  try {
    return NextResponse.json(runCatalogTool('compare_pieces', { slugs }));
  } catch (err) {
    if (err instanceof CatalogToolError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
