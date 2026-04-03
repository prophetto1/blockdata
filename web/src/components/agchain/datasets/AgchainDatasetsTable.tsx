import { useNavigate } from 'react-router-dom';
import type { AgchainDatasetListRow } from '@/lib/agchainDatasets';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type AgchainDatasetsTableProps = {
  items: AgchainDatasetListRow[];
  loading: boolean;
};

const SOURCE_TYPE_BADGE: Record<string, 'blue' | 'violet' | 'green' | 'orange'> = {
  csv: 'blue',
  json: 'violet',
  jsonl: 'blue',
  huggingface: 'green',
};

const VALIDATION_BADGE: Record<string, 'green' | 'yellow' | 'red' | 'gray'> = {
  pass: 'green',
  warn: 'yellow',
  fail: 'red',
  unknown: 'gray',
};

const VALIDATION_LABEL: Record<string, string> = {
  pass: 'Pass',
  warn: 'Warn',
  fail: 'Fail',
  unknown: 'Unknown',
};

function formatSampleCount(count: number) {
  return count.toLocaleString();
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays > 7) return date.toLocaleDateString();
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return 'Just now';
}

export function AgchainDatasetsTable({ items, loading }: AgchainDatasetsTableProps) {
  const navigate = useNavigate();

  return (
    <section className="flex flex-col overflow-hidden rounded-3xl border border-border/70 bg-card/70 shadow-sm">
      <ScrollArea className="min-h-0 flex-1">
        <table className="w-full text-left">
          <thead className="sticky top-0 z-10 bg-card text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-6 py-3 font-medium">Dataset</th>
              <th className="px-6 py-3 font-medium">Current Version</th>
              <th className="px-6 py-3 font-medium">Samples</th>
              <th className="px-6 py-3 font-medium">Validation</th>
              <th className="px-6 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-muted-foreground">
                  Loading datasets...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <svg
                      className="h-10 w-10 text-muted-foreground/50"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125"
                      />
                    </svg>
                    <p className="text-sm font-medium text-foreground">No datasets yet</p>
                    <p className="text-sm text-muted-foreground">Add your first dataset to get started with evaluation</p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr
                  key={row.dataset_id}
                  onClick={() => navigate(`/app/agchain/datasets/${row.dataset_id}`)}
                  className={cn(
                    'cursor-pointer border-b border-border/60 align-top hover:bg-accent/20',
                  )}
                >
                  <td className="max-w-[16rem] px-6 py-4">
                    <div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="truncate text-sm font-medium text-foreground">{row.name}</p>
                        </TooltipTrigger>
                        <TooltipContent>{row.name}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.slug}</p>
                        </TooltipTrigger>
                        <TooltipContent>{row.slug}</TooltipContent>
                      </Tooltip>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={SOURCE_TYPE_BADGE[row.source_type] ?? 'gray'} size="sm">
                        {row.source_type.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-foreground">
                        {row.latest_version_label ?? '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {formatSampleCount(row.sample_count)}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={VALIDATION_BADGE[row.validation_status] ?? 'gray'} size="sm">
                      {VALIDATION_LABEL[row.validation_status] ?? row.validation_status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {formatRelativeTime(row.updated_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ScrollArea>
    </section>
  );
}
