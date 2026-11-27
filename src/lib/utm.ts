export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const;

export type UtmKey = (typeof UTM_KEYS)[number];
export type UtmFields = Record<UtmKey, string>;

const MAX_UTM_VALUE = 300;

export function sanitizeUtmValue(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  let out = '';
  for (const ch of raw) {
    const code = ch.charCodeAt(0);
    if (code < 32 || code === 127) continue;
    out += ch;
  }
  return out.trim().slice(0, MAX_UTM_VALUE);
}

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return sanitizeUtmValue(value[0] ?? '');
  return sanitizeUtmValue(value);
}

/**
 * Read the four UTM keys from a URLSearchParams or a Next.js searchParams
 * object. Missing keys become empty strings.
 */
export function utmFromSearchParams(
  sp:
    | { get: (key: string) => string | null }
    | Record<string, string | string[] | undefined>,
): UtmFields {
  const read = (key: UtmKey): string => {
    if (sp && typeof (sp as { get?: unknown }).get === 'function') {
      return sanitizeUtmValue((sp as { get: (k: string) => string | null }).get(key));
    }
    return firstValue((sp as Record<string, string | string[] | undefined>)[key]);
  };
  return {
    utm_source: read('utm_source'),
    utm_medium: read('utm_medium'),
    utm_campaign: read('utm_campaign'),
    utm_content: read('utm_content'),
  };
}

export function emptyUtm(): UtmFields {
  return { utm_source: '', utm_medium: '', utm_campaign: '', utm_content: '' };
}

/** Non-empty UTM entries for the shop alert and the inquiry POST. */
export function presentUtm(utm: UtmFields): Partial<UtmFields> {
  const out: Partial<UtmFields> = {};
  for (const key of UTM_KEYS) {
    if (utm[key]) out[key] = utm[key];
  }
  return out;
}
