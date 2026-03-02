import { useSyncExternalStore } from 'react';

function subscribeTheme(onStoreChange: () => void): () => void {
  if (typeof document === 'undefined') return () => {};
  const observer = new MutationObserver(() => onStoreChange());
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  return () => observer.disconnect();
}

function getMonacoTheme(): string {
  if (typeof document === 'undefined') return 'vs-dark';
  return document.documentElement.getAttribute('data-theme') === 'light'
    ? 'light'
    : 'vs-dark';
}

export function useMonacoTheme(): string {
  return useSyncExternalStore(subscribeTheme, getMonacoTheme, () => 'vs-dark');
}
