import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { AgchainToolRegistryRow } from '@/lib/agchainTools';

type AgchainToolsTableProps = {
  rows: AgchainToolRegistryRow[];
  loading: boolean;
  selectedToolKey: string | null;
  onInspect: (row: AgchainToolRegistryRow) => void;
  error?: string | null;
  headerControls?: ReactNode;
};

const SOURCE_BADGE: Record<string, 'blue' | 'teal' | 'violet' | 'orange' | 'gray'> = {
  builtin: 'blue',
  custom: 'teal',
  bridged: 'violet',
  mcp_server: 'orange',
};

export function AgchainToolsTable({
  rows,
  loading,
  selectedToolKey,
  onInspect,
  error,
  headerControls,
}: AgchainToolsTableProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-border/70 bg-card/70 shadow-sm">
      <div className="border-b border-border/70 px-6 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">Tool registry</h2>
            <p className="mt-1 text-[var(--app-table-body-font)] leading-6 text-muted-foreground">
              Merge the read-only built-in catalog with project-authored tool definitions in one registry view.
            </p>
          </div>
          {headerControls ? <div className="xl:shrink-0">{headerControls}</div> : null}
        </div>
        {error ? (
            <p className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-[var(--app-table-body-font)] text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <table className="w-full text-left">
            <thead className="sticky top-0 z-10 bg-card text-[var(--app-table-header-font)] uppercase tracking-[0.16em] text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-6 py-3 font-medium">Tool</th>
              <th className="px-6 py-3 font-medium">Source</th>
              <th className="px-6 py-3 font-medium">Scope</th>
              <th className="px-6 py-3 font-medium">Latest</th>
              <th className="px-6 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-[var(--app-table-body-font)] text-muted-foreground">
                  Loading tools...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-[var(--app-table-body-font)] text-muted-foreground">
                  No tools match the current filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const rowKey = row.tool_id ?? row.tool_ref ?? row.tool_name;
                const isSelected = rowKey === selectedToolKey;
                return (
                  <tr
                    key={rowKey}
                    className={cn(
                      'border-b border-border/60 align-top transition-colors hover:bg-[var(--app-table-row-hover-bg)]',
                      isSelected && [
                        'bg-[var(--app-table-row-selected-bg)]',
                        'text-[var(--app-table-row-selected-fg)]',
                        'ring-1 ring-inset ring-[var(--app-table-row-selected-ring)]',
                      ],
                    )}
                  >
                    <td className="max-w-[18rem] px-6 py-4">
                      <div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                          <p className="truncate text-[var(--app-table-body-font)] font-medium text-foreground">{row.display_name}</p>
                          </TooltipTrigger>
                          <TooltipContent>{row.display_name}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="mt-1 truncate text-[var(--app-table-meta-font)] text-muted-foreground">{row.description || row.tool_name}</p>
                          </TooltipTrigger>
                          <TooltipContent>{row.description || row.tool_name}</TooltipContent>
                        </Tooltip>
                        {row.read_only ? (
                          <p className="mt-2 text-[var(--app-table-meta-font)] font-medium text-muted-foreground">Read-only built-in</p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={SOURCE_BADGE[row.source_kind] ?? 'gray'} size="sm">
                        {row.source_kind}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-[var(--app-table-body-font)] text-foreground">{row.scope_kind}</td>
                    <td className="px-6 py-4 text-[var(--app-table-body-font)] text-muted-foreground">
                      {row.latest_version?.version_label ?? 'Catalog'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onInspect(row)}
                        aria-label={`Inspect ${row.display_name}`}
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </ScrollArea>
    </section>
  );
}
