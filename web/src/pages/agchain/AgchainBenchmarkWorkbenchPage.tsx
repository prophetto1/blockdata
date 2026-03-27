import { useLocation, useParams } from 'react-router-dom';
import { AgchainPageFrame } from './AgchainPageFrame';

const SECTION_LABELS: Record<string, string> = {
  '#steps':      'Steps',
  '#questions':  'Questions',
  '#context':    'Context',
  '#state':      'State',
  '#scoring':    'Scoring',
  '#models':     'Models',
  '#runner':     'Runner',
  '#validation': 'Validation',
  '#runs':       'Runs',
};

function formatBenchmarkTitle(benchmarkId: string): string {
  return benchmarkId
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('-');
}

export default function AgchainBenchmarkWorkbenchPage() {
  const { benchmarkId } = useParams<{ benchmarkId: string }>();
  const { hash } = useLocation();
  const title = formatBenchmarkTitle(benchmarkId ?? '');
  const activeHash = hash || '#steps';
  const activeLabel = SECTION_LABELS[activeHash] ?? 'Steps';

  return (
    <AgchainPageFrame className="gap-8 py-10">
      <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Benchmark</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          {activeLabel} — not yet implemented.
        </p>
      </section>
    </AgchainPageFrame>
  );
}
