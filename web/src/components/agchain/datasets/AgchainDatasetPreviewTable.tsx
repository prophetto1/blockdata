import type { AgchainDatasetSampleSummary } from '@/lib/agchainDatasets';
import { ScrollArea } from '@/components/ui/scroll-area';

type AgchainDatasetPreviewTableProps = {
  samples: AgchainDatasetSampleSummary[];
  loading: boolean;
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

export function AgchainDatasetPreviewTable({ samples, loading }: AgchainDatasetPreviewTableProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-border/70 bg-card/70">
      <ScrollArea className="min-h-0">
        <table className="w-full text-left">
          <thead className="sticky top-0 z-10 bg-card text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-4 py-2.5 font-medium">ID</th>
              <th className="px-4 py-2.5 font-medium">Input Preview</th>
              <th className="px-4 py-2.5 font-medium">Target Preview</th>
              <th className="px-4 py-2.5 font-medium text-center">Choices</th>
              <th className="px-4 py-2.5 font-medium text-center">Setup</th>
              <th className="px-4 py-2.5 font-medium text-center">Sandbox</th>
              <th className="px-4 py-2.5 font-medium text-center">Files</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Loading preview...
                </td>
              </tr>
            ) : samples.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No preview samples available.
                </td>
              </tr>
            ) : (
              samples.map((sample, idx) => (
                <tr key={sample.sample_id ?? idx} className="border-b border-border/50">
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
                    <BoolBadge value={sample.choices.length > 0} />
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ScrollArea>
    </section>
  );
}
