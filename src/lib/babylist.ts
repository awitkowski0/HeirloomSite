/*
 * The one place that talks to Babylist's add.js, loaded in the root layout.
 *
 * add.js takes one item per call and reports nothing back, so a successful call
 * means only that the item was handed to Babylist. Callers say "Sent to
 * Babylist" and never that it was added. A blocked or missing script returns
 * 'unavailable' so the caller can show a working alternative.
 */
export interface RegistryLine {
  key: string;
  title: string;
  /** A site-relative image path. */
  image: string;
  /** The exact wood-and-finish page, site-relative. */
  href: string;
  /** What this line costs, in dollars. */
  price: number;
}

interface BabylistApi {
  addToRegistry?: (item: Record<string, string>) => void;
}

export function registryTitle(name: string, finish: string | null): string {
  return finish ? `${name}, ${finish}` : name;
}

export function registryPayload(line: RegistryLine, origin: string): Record<string, string> {
  return {
    images: line.image.startsWith('http') ? line.image : `${origin}${line.image}`,
    price: String(line.price),
    title: line.title,
    url: `${origin}${line.href}`,
  };
}

export function sendToBabylist(line: RegistryLine): 'sent' | 'unavailable' {
  const api = (window as typeof window & { bl?: BabylistApi }).bl;
  if (typeof api?.addToRegistry !== 'function') return 'unavailable';
  try {
    api.addToRegistry(registryPayload(line, window.location.origin));
    return 'sent';
  } catch {
    return 'unavailable';
  }
}
