import { NextResponse } from 'next/server';
import { ATTRIBUTION, getCatalog } from '@/lib/catalog-tools';

export const dynamic = 'force-static';

/* The whole browsable catalog for AI agents. Built once at deploy time. */
export function GET() {
  return NextResponse.json({ attribution: ATTRIBUTION, pieces: getCatalog() });
}
