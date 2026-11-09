/*
 * Plain requests, matched by rules. No model is involved, so a phrase that
 * matches nothing has to say so on the page instead of guessing.
 */
export interface Filters {
  use?: string;
  top?: 'arched' | 'flat';
  front?: 'slats' | 'panel';
  tone?: 'light' | 'dark';
  max?: number;
  q?: string;
}

export type Intent = { kind: 'gift' } | { kind: 'pick' } | { kind: 'filter'; filters: Filters } | { kind: 'none' };

export function parseIntent(raw: string): Intent {
  const q = raw.toLowerCase().trim();
  if (!q) return { kind: 'none' };
  if (/\bgift|grand(son|daughter|child|baby|kid)|\bshower\b|\bpresent\b/.test(q)) return { kind: 'gift' };
  if (/not sure|don.?t know|help me|surprise/.test(q)) return { kind: 'pick' };
  const f: Filters = {};
  if (/arch|curv|round/.test(q)) f.top = 'arched';
  if (/\bflat\b|straight top/.test(q)) f.top = 'flat';
  if (/slat/.test(q)) f.front = 'slats';
  if (/panel|solid front/.test(q)) f.front = 'panel';
  if (/\blight\b|pale|natural|blond/.test(q)) f.tone = 'light';
  if (/\bdark\b|espresso|black|charcoal/.test(q)) f.tone = 'dark';
  if (/\bcrib/.test(q)) f.use = 'CRIB';
  if (/grow|convert|toddler|\blast/.test(q)) f.use = 'TODDLER BED';
  if (/full.?(size|bed)/.test(q)) f.use = 'FULL BED';
  if (/day ?bed/.test(q)) f.use = 'DAY BED';
  if (/\bmini\b|small|tiny|compact/.test(q)) f.use = 'MINI';
  if (/dresser|drawers/.test(q)) f.use = 'DRESSER';
  if (/changing/.test(q)) f.use = 'CHANGING TABLE';
  if (/hutch/.test(q)) f.use = 'HUTCH';
  const max = q.match(/under\s*\$?\s*([\d,]+)/);
  if (max) f.max = Number(max[1].replace(/,/g, ''));
  return Object.keys(f).length > 0 ? { kind: 'filter', filters: { ...f, q: raw.trim() } } : { kind: 'none' };
}

export function filtersToHash(filters: Filters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const out = params.toString();
  return out ? `#${out}` : '';
}

export function filtersFromHash(hash: string): Filters {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const f: Filters = {};
  const use = params.get('use');
  if (use) f.use = use;
  const top = params.get('top');
  if (top === 'arched' || top === 'flat') f.top = top;
  const front = params.get('front');
  if (front === 'slats' || front === 'panel') f.front = front;
  const tone = params.get('tone');
  if (tone === 'light' || tone === 'dark') f.tone = tone;
  const max = Number(params.get('max'));
  if (Number.isFinite(max) && max > 0) f.max = max;
  const q = params.get('q');
  if (q) f.q = q;
  return f;
}
