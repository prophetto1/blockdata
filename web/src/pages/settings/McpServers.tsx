import { useMemo, useState } from 'react';
import { MCP_CATALOG } from '@/components/mcp/mcp-catalog';
import { McpServerCard } from '@/components/mcp/McpServerCard';

export default function McpServers() {
  const [query, setQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MCP_CATALOG;
    return MCP_CATALOG.filter((s) => `${s.title} ${s.description} ${s.id}`.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="space-y-4">
      {statusMessage && (
        <div className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground" role="status" aria-live="polite">
          {statusMessage}
        </div>
      )}
      <div>
        <h2 className="text-sm font-semibold text-foreground">MCP Servers</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Catalog and connection state for Model Context Protocol servers.
        </p>
      </div>

      <input
        type="text"
        placeholder="Search MCP servers..."
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {filtered.map((server) => (
          <McpServerCard
            key={server.id}
            server={server}
            status={server.id === 'context7' || server.id === 'playwright' ? 'connected' : 'disconnected'}
            actionLabel={server.id === 'firecrawl' || server.id === 'postgres' ? 'Configure' : 'Connect'}
            onAction={() => {
              setStatusMessage('Placeholder action (not wired yet).');
            }}
          />
        ))}
      </div>
    </div>
  );
}
