/*
 * The one place that talks to Babylist's add.js, loaded only when a shopper
 * reaches for the button. A third-party script on the page can read local
 * storage, so it does not get to run on every visit.
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

const SCRIPT_SRC = 'https://babylist.com/add.js';
const LOAD_TIMEOUT_MS = 6000;
let loading: Promise<boolean> | null = null;

type BabylistWindow = typeof window & { bl?: BabylistApi; _bl?: { partner: string } };

function ready(): boolean {
  return typeof (window as BabylistWindow).bl?.addToRegistry === 'function';
}

/** Loads add.js once. Call it when a shopper hovers or focuses a Babylist button. */
export function preloadBabylist(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (ready()) return Promise.resolve(true);
  if (loading) return loading;
  loading = new Promise<boolean>(resolve => {
    const finish = (ok: boolean) => {
      if (!ok) loading = null;
      resolve(ok);
    };
    const started = Date.now();
    const poll = () => {
      if (ready()) finish(true);
      else if (Date.now() - started > LOAD_TIMEOUT_MS) finish(false);
      else window.setTimeout(poll, 50);
    };
    (window as BabylistWindow)._bl = { partner: window.location.hostname };
    const script = document.createElement('script');
    script.async = true;
    script.src = SCRIPT_SRC;
    script.onerror = () => finish(false);
    document.head.appendChild(script);
    poll();
  });
  return loading;
}

export async function sendToBabylist(line: RegistryLine): Promise<'sent' | 'unavailable'> {
  await preloadBabylist();
  const api = (window as BabylistWindow).bl;
  if (typeof api?.addToRegistry !== 'function') return 'unavailable';
  try {
    api.addToRegistry(registryPayload(line, window.location.origin));
    return 'sent';
  } catch {
    return 'unavailable';
  }
}
