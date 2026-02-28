import { useMemo, useState } from 'react';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Input } from '@/components/ui/input';
import {
  ICON_CONTEXT_SIZE,
  ICON_SIZES,
  ICON_STANDARD,
  ICON_STROKES,
} from '@/lib/icon-contract';
import { MCP_CATALOG } from '@/components/mcp/mcp-catalog';
import { McpServerCard } from '@/components/mcp/McpServerCard';
import { SettingsPageFrame } from './SettingsPageHeader';

const ACTIVE_MCP_SERVER_IDS = new Set(['context7', 'playwright']);

function getServerStatus(serverId: string): 'connected' | 'disconnected' {
  return serverId === 'context7' || serverId === 'playwright' ? 'connected' : 'disconnected';
}

export default function McpServers() {
  const [query, setQuery] = useState('');
  const utilityIconSize = ICON_SIZES[ICON_CONTEXT_SIZE[ICON_STANDARD.utilityTopRight.context]];
  const utilityIconStroke = ICON_STROKES[ICON_STANDARD.utilityTopRight.stroke];

  const filtered = useMemo(() => {
    let list = MCP_CATALOG.filter((s) => ACTIVE_MCP_SERVER_IDS.has(s.id));

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((s) => `${s.title} ${s.description} ${s.id}`.toLowerCase().includes(q));
    }

    return list;
  }, [query]);

  const toolbar = (
    <>
      <div role="toolbar" aria-label="MCP server filters" className="flex items-center gap-1.5">
        <HugeiconsIcon icon={Search01Icon} size={utilityIconSize} strokeWidth={utilityIconStroke} className="shrink-0 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search servers..."
          className="h-7 w-48 border-transparent bg-transparent px-1.5 text-xs shadow-none focus-visible:ring-0 focus-visible:border-border"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
        />
      </div>
    </>
  );

  return (
    <SettingsPageFrame
      title="MCP Servers"
      description="Catalog and connection state for Model Context Protocol servers."
      toolbar={toolbar}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {filtered.map((server) => {
          const status = getServerStatus(server.id);
          return (
            <McpServerCard
              key={server.id}
              server={server}
              status={status}
            />
          );
        })}
      </div>
    </SettingsPageFrame>
  );
}
