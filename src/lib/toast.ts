const EVENT = 'heirloom_toast';

export function toast(message: string) {
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: message }));
}

export function onToast(listener: (message: string) => void) {
  const handler = (e: Event) => listener((e as CustomEvent<string>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
