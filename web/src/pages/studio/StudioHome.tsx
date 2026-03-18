import { Link } from 'react-router-dom';
import {
  IconCode,
  IconBrandPython,
  IconLayoutDashboard,
  IconTable,
  IconHistory,
  IconCalendarStats,
  IconArrowRight,
  type Icon,
} from '@tabler/icons-react';
import { styleTokens } from '@/lib/styleTokens';

type StudioPillar = {
  label: string;
  displayLabel: string;
  icon: Icon;
  color: string;
  path: string;
  description: string;
};

const PILLARS: StudioPillar[] = [
  { label: 'SQL',    displayLabel: 'SQL',    icon: IconCode,            color: styleTokens.studio.colors.sql,    path: '/app/studio/sql',    description: 'Write SQL transforms against your connected data sources' },
  { label: 'Python', displayLabel: 'PYTHON', icon: IconBrandPython,     color: styleTokens.studio.colors.python, path: '/app/studio/python', description: 'Transform data with pandas, polars, and custom scripts' },
  { label: 'Visual', displayLabel: 'VISUAL', icon: IconLayoutDashboard, color: styleTokens.studio.colors.visual, path: '/app/studio/visual', description: 'Build query pipelines without code using the visual builder' },
  { label: 'Tables', displayLabel: 'TABLES', icon: IconTable,           color: styleTokens.studio.colors.data,   path: '/app/studio/data',   description: 'Browse schemas, preview tables, and inspect row counts' },
  { label: 'Runs',   displayLabel: 'RUNS',   icon: IconHistory,         color: styleTokens.studio.colors.runs,   path: '/app/studio/runs',   description: 'View execution history, logs, and output previews' },
  { label: 'Jobs',   displayLabel: 'JOBS',   icon: IconCalendarStats,   color: styleTokens.studio.colors.jobs,   path: '/app/studio/jobs',   description: 'Schedule transforms with cron triggers and dependencies' },
];

export default function StudioHome() {
  return (
    <div
      className="flex h-full flex-col overflow-auto p-8"
      style={{ backgroundColor: styleTokens.studio.background }}
    >
      <div className="mb-8">
        <p
          className="mb-2 font-mono text-[10px] tracking-widest"
          style={{ color: 'var(--muted-foreground)', opacity: 0.4 }}
        >
          // WORKSPACE
        </p>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--foreground)' }}>
          Data Studio
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Build, run, and schedule data transforms across your connected sources.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PILLARS.map((pillar) => (
          <Link
            key={pillar.path}
            to={pillar.path}
            aria-label={pillar.label}
            className="group relative flex flex-col gap-3 overflow-hidden rounded-md p-5 transition-colors"
            style={{
              backgroundColor: styleTokens.studio.surface,
              border: `1px solid ${styleTokens.studio.border}`,
              borderLeftColor: pillar.color,
              borderLeftWidth: 3,
              textDecoration: 'none',
            }}
          >
            <div className="flex items-center gap-2">
              <pillar.icon size={15} stroke={2} style={{ color: pillar.color, flexShrink: 0 }} />
              <span className="font-mono text-[11px] font-semibold tracking-widest" style={{ color: pillar.color }}>
                {pillar.displayLabel}
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
              {pillar.description}
            </p>
            <div className="mt-auto flex items-center gap-1">
              <span className="font-mono text-[11px] tracking-wider" style={{ color: 'var(--muted-foreground)' }}>
                ENTER
              </span>
              <IconArrowRight size={11} stroke={1.75} style={{ color: 'var(--muted-foreground)' }} />
            </div>
            <div
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
              style={{ backgroundColor: `${pillar.color}08` }}
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
