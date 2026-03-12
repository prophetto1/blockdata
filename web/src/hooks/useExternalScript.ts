import { useEffect, useState } from 'react';

type ScriptStatus = 'idle' | 'loading' | 'ready' | 'error';

const cache = new Map<string, Promise<void>>();

/**
 * Load an external script tag by URL. Returns its loading status.
 * Deduplicates across multiple consumers of the same URL.
 */
export function useExternalScript(src: string | null): ScriptStatus {
  // Always start idle — the effect resolves the actual status from the
  // cache promise, which may have rejected (bug fix from handoff doc).
  const [status, setStatus] = useState<ScriptStatus>('idle');

  useEffect(() => {
    if (!src) {
      setStatus('idle');
      return;
    }

    if (cache.has(src)) {
      cache.get(src)!.then(() => setStatus('ready')).catch(() => setStatus('error'));
      return;
    }

    setStatus('loading');

    const promise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });

    cache.set(src, promise);
    promise.then(() => setStatus('ready')).catch(() => setStatus('error'));
  }, [src]);

  return status;
}
