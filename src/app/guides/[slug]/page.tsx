import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getGuide, getGuides } from '@/content/guides';
import { guideMetadata } from '@/lib/guides';
import GuideArticle from '@/components/guides/GuideArticle';
import '../guides.css';

type Params = { slug: string };

// Only the slugs in the registry exist. Anything else is a real 404, and the
// route stays fully static (nothing is read per request).
export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getGuides().map(g => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  return guide ? guideMetadata(guide) : {};
}

export default async function GuidePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();
  return <GuideArticle guide={guide} />;
}
