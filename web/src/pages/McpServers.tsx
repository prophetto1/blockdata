import { useMemo, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { PageHeader } from '@/components/common/PageHeader';
import { MCP_CATALOG } from '@/components/mcp/mcp-catalog';
import { McpServerCard } from '@/components/mcp/McpServerCard';

export default function McpServers() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MCP_CATALOG;
    return MCP_CATALOG.filter((s) => `${s.title} ${s.description} ${s.id}`.toLowerCase().includes(q));
  }, [query]);

  return (
    <>
      <PageHeader
        title="MCP"
        subtitle="Catalog and placeholder connect state. Tool wiring and real connections come later."
      />

      <input
        type="text"
        placeholder="Search MCP servers..."
        className="mb-4 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
              notifications.show({ color: 'blue', message: 'Placeholder action (not wired yet).' });
            }}
          />
        ))}
      </div>
    </>
  );
}
