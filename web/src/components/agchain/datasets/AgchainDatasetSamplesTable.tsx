import { useState } from 'react';
import type { AgchainDatasetSampleSummary } from '@/lib/agchainDatasets';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

type AgchainDatasetSamplesTableProps = {
  samples: AgchainDatasetSampleSummary[];
  loading: boolean;
  onSelectSample: (sampleId: string) => void;
};

const PARSE_STATUS_BADGE: Record<string, 'green' | 'yellow' | 'red'> = {
  ok: 'green',
  warn: 'yellow',
  error: 'red',
};

const PARSE_STATUS_LABEL: Record<string, string> = {
  ok: 'Pass',
  warn: 'Warn',
  error: 'Fail',
};

function BoolBadge({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20 text-green-400">
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </span>
  ) : (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 text-red-400">
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </span>
  );
}

function truncate(value: string | null, maxLen = 40) {
  if (!value) return '-';
  return value.length > maxLen ? `${value.slice(0, maxLen)}...` : value;
}

export function AgchainDatasetSamplesTable({
  samples,
  loading,
  onSelectSample,
}: AgchainDatasetSamplesTableProps) {
  const [search, setSearch] = useState('');
  const [parseStatusFilter, setParseStatusFilter] = useState<string | null>(null);

  const filtered = samples.filter((sample) => {
    if (search) {
      const lower = search.toLowerCase();
      if (
        !(sample.sample_id ?? '').toLowerCase().includes(lower) &&
        !(sample.input_preview ?? '').toLowerCase().includes(lower)
      ) {
        return false;
      }
    }
    if (parseStatusFilter && sample.parse_status !== parseStatusFilter) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search samples..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 flex-1 rounded-md border border-border bg-background pl-3 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <select
          value={parseStatusFilter ?? ''}
          onChange={(e) => setParseStatusFilter(e.target.value || null)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
        >
          <option value="">All statuses</option>
          <option value="ok">Pass</option>
          <option value="warn">Warn</option>
          <option value="error">Fail</option>
        </select>
      </div>

      <section className="overflow-hidden rounded-xl border border-border/70 bg-card/70">
        <ScrollArea className="min-h-0">
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10 bg-card text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 font-medium">Sample ID</th>
                <th className="px-4 py-2.5 font-medium">Input Preview</th>
                <th className="px-4 py-2.5 font-medium">Target Preview</th>
                <th className="px-4 py-2.5 font-medium text-center">Setup</th>
                <th className="px-4 py-2.5 font-medium text-center">Sandbox</th>
                <th className="px-4 py-2.5 font-medium text-center">Files</th>
                <th className="px-4 py-2.5 font-medium">Parse Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Loading samples...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No samples found.
                  </td>
                </tr>
              ) : (
                filtered.map((sample, idx) => (
                  <tr
                    key={sample.sample_id ?? idx}
                    onClick={() => sample.sample_id && onSelectSample(sample.sample_id)}
                    className="cursor-pointer border-b border-border/50 hover:bg-accent/20"
                  >
                    <td className="px-4 py-2.5 text-sm font-mono text-foreground">
                      {sample.sample_id ?? '-'}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-foreground">
                      {truncate(sample.input_preview)}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-foreground">
                      {truncate(sample.target_preview)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <BoolBadge value={sample.has_setup} />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <BoolBadge value={sample.has_sandbox} />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <BoolBadge value={sample.has_files} />
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={PARSE_STATUS_BADGE[sample.parse_status] ?? 'gray'} size="sm">
                        {PARSE_STATUS_LABEL[sample.parse_status] ?? sample.parse_status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ScrollArea>
      </section>
    </div>
  );
}
