import { useMemo, useState } from 'react';
import { SimpleGrid, TextInput } from '@mantine/core';
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

      <TextInput
        placeholder="Search MCP servers..."
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        mb="md"
      />

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
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
      </SimpleGrid>
    </>
  );
}

