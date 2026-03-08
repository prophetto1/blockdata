import { useState, useEffect, useRef, useCallback } from 'react';
import { create, load, search } from '@orama/orama';
import type { AnyOrama, Results } from '@orama/orama';

/**
 * Custom DB loader that respects the site's base path (/docs).
 * The @orama/plugin-astro client hardcodes `/assets/...` which breaks
 * when the site is deployed under a base path.
 */
async function loadOramaDB(dbName: string): Promise<AnyOrama> {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const url = `${base}/assets/oramaDB_${dbName}.json`;
  const response = await fetch(url);
  const data = await response.json();
  const db = create({ schema: { _: 'string' } as const });
  load(db, data);
  return db;
}

interface SearchHit {
  id: string;
  document: {
    path: string;
    title: string;
    h1: string;
    content: string;
  };
}

export default function OramaSearchPanel() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchHit[]>([]);
  const [db, setDb] = useState<AnyOrama | null>(null);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadOramaDB('docsearch')
      .then(setDb)
      .catch((err) => console.error('Failed to load Orama DB:', err))
      .finally(() => setLoading(false));
  }, []);

  const doSearch = useCallback(
    async (term: string) => {
      if (!db || !term.trim()) {
        setResults([]);
        return;
      }
      const res: Results<SearchHit['document']> = await search(db, {
        term,
        limit: 10,
        threshold: 0,
      });
      setResults(res.hits as unknown as SearchHit[]);
    },
    [db],
  );

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 150);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

  return (
    <div className="orama-panel">
      <div className="orama-input-wrap">
        <svg
          className="orama-search-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search docs..."
          autoFocus
          className="orama-input"
        />
      </div>

      {loading && (
        <p className="orama-status">Loading search index...</p>
      )}

      {!loading && query && results.length === 0 && (
        <p className="orama-status">No results found.</p>
      )}

      {results.length > 0 && (
        <ul className="orama-results">
          {results.map((hit) => {
            const href = hit.document.path.startsWith('/')
              ? `${base}${hit.document.path}`
              : `${base}/${hit.document.path}`;
            const snippet = hit.document.content?.slice(0, 180);
            return (
              <li key={hit.id} className="orama-result">
                <a href={href}>
                  <span className="orama-result-title">
                    {hit.document.title || hit.document.h1}
                  </span>
                  {snippet && (
                    <span className="orama-result-excerpt">{snippet}...</span>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
