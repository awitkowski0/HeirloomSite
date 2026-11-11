/**
 * The one piece of markup guide copy may carry: an inline link written
 * `[label](href)`. Everything else in a copy string is plain text.
 *
 * Kept tiny on purpose (no Markdown, no HTML), so the page renderer, the
 * plain-text schema copy and the link checker in tests/guides.test.ts all read
 * the same strings the same way.
 */
export type InlineSegment = { text: string } | { label: string; href: string };

const LINK = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;

export function parseInline(text: string): InlineSegment[] {
  const out: InlineSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ text: text.slice(last, at) });
    out.push({ label: m[1], href: m[2] });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/** The visible text of a copy string: link labels kept, targets dropped. */
export function plainText(text: string): string {
  return parseInline(text)
    .map(s => ('text' in s ? s.text : s.label))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Every link target written inside a copy string. */
export function inlineHrefs(text: string): string[] {
  return parseInline(text).flatMap(s => ('href' in s ? [s.href] : []));
}

export function isInternalHref(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//');
}
