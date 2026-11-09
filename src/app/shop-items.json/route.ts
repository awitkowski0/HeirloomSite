import { NextResponse } from 'next/server';
import { getBrowsableProducts } from '@/lib/content';
import { toShopItems } from '@/lib/shop';

export const dynamic = 'force-static';

/* Loaded when the compare view opens, so flipping costs nothing until then. */
export function GET() {
  return NextResponse.json(toShopItems(getBrowsableProducts()));
}
