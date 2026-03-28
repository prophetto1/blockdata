import { Link, useLocation } from 'react-router-dom';
import {
  IconActivity,
  IconAtom2,
  IconChartBar,
  IconClipboardList,
  IconDatabase,
  IconFileText,
  IconLayoutDashboard,
  IconPlayerPlay,
  IconTestPipe,
  type Icon,
} from '@tabler/icons-react';

type BenchmarkSection = { label: string; icon: Icon; hash: string };

const BENCHMARK_SECTIONS: BenchmarkSection[] = [
  { label: 'Steps',      icon: IconClipboardList,  hash: '#steps' },
  { label: 'Questions',  icon: IconFileText,        hash: '#questions' },
  { label: 'Context',    icon: IconLayoutDashboard, hash: '#context' },
  { label: 'State',      icon: IconDatabase,        hash: '#state' },
  { label: 'Scoring',    icon: IconChartBar,        hash: '#scoring' },
  { label: 'Models',     icon: IconAtom2,           hash: '#models' },
  { label: 'Runner',     icon: IconPlayerPlay,      hash: '#runner' },
  { label: 'Validation', icon: IconTestPipe,        hash: '#validation' },
  { label: 'Runs',       icon: IconActivity,        hash: '#runs' },
];

export function AgchainBenchmarkNav({ benchmarkId }: { benchmarkId: string }) {
  const { hash } = useLocation();
  const activeHash = hash || '#steps';
  const basePath = `/app/agchain/benchmarks/${encodeURIComponent(benchmarkId)}`;

  return (
    <nav
      aria-label="Benchmark sections"
      data-testid="agchain-secondary-rail"
      className="flex h-full flex-col overflow-y-auto overflow-x-hidden px-2 py-3"
      style={{ backgroundColor: 'var(--background)' }}
    >
      <div className="flex flex-col space-y-0 px-1">
        {BENCHMARK_SECTIONS.map((section) => {
          const SectionIcon = section.icon;
          const isActive = activeHash === section.hash;
          return (
            <Link
              key={section.hash}
              to={`${basePath}${section.hash}`}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'flex items-center gap-2.5 rounded-md px-2 h-7 text-[13px] transition-colors',
                isActive
                  ? 'bg-accent text-foreground font-semibold'
                  : 'font-medium text-foreground/70 hover:bg-accent/50 hover:text-foreground',
              ].join(' ')}
            >
              <SectionIcon size={14} stroke={1.75} className="shrink-0" />
              <span className="truncate">{section.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}