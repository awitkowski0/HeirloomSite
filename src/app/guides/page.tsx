import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getGuides } from '@/content/guides';
import { guidesIndexMetadata } from '@/lib/guides';
import GuideIndex from '@/components/guides/GuideIndex';
import './guides.css';

export function generateMetadata(): Metadata {
  const guides = getGuides();
  // No guides yet: the page renders as a 404 (Next adds noindex itself).
  return guides.length > 0 ? guidesIndexMetadata(guides) : {};
}

/*
 * The index of every guide. While the registry is empty it answers 404, so an
 * empty, thin page is never served or indexed.
 */
export default function GuidesIndexPage() {
  const guides = getGuides();
  if (guides.length === 0) notFound();
  return <GuideIndex guides={guides} />;
}
