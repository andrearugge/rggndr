export interface LabVariant {
  id: string;
  label: string;
}

/** Legge la variante attiva da `?v=`; se assente o non valida torna `defaultId`. */
export function getVariant(defaultId: string, allowed?: string[]): string {
  const v = new URLSearchParams(window.location.search).get('v');
  if (!v) return defaultId;
  if (allowed && !allowed.includes(v)) return defaultId;
  return v;
}

export function onVariantChange(cb: (id: string) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<string>).detail);
  window.addEventListener('lab:variant', handler);
  return () => window.removeEventListener('lab:variant', handler);
}
