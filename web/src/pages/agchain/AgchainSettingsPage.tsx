import { Link } from 'react-router-dom';
import { useAgchainProjectFocus } from '@/hooks/agchain/useAgchainProjectFocus';
import { AgchainPageFrame } from './AgchainPageFrame';

const SETTINGS_PARTITIONS = [
  {
    title: 'Project',
    description: 'Project-owned configuration, benchmark definition, and evaluation-specific controls.',
    bullets: [
      'Benchmark-backed definition editing now lives here instead of in the primary rail.',
      'Project settings are where runtime defaults, prompt/scorer coupling, and evaluation configuration should converge.',
    ],
    cta: {
      label: 'Open benchmark definition',
      href: '/app/agchain/settings/project/benchmark-definition',
    },
  },
  {
    title: 'Organization',
    description: 'Shared policies and reusable assets that eventually need organization-level ownership.',
    bullets: [
      'Provider defaults, shared prompt libraries, and governance rules belong here once the organization shell is implemented.',
      'This partition is visible now so later work does not need to re-open the level-one information architecture.',
    ],
  },
  {
    title: 'Personal',
    description: 'User-local preferences and shortcuts that should not drift into project-owned controls.',
    bullets: [
      'Personal toggles, workflow shortcuts, and user-level defaults will eventually live here.',
      'Keeping the partition visible now prevents project settings from becoming a catch-all bucket.',
    ],
  },
];

export default function AgchainSettingsPage() {
  const { focusedProject, loading } = useAgchainProjectFocus();

  if (!loading && !focusedProject) {
    return (
      <AgchainPageFrame className="gap-6 py-8">
        <section className="rounded-3xl border border-border/70 bg-card/70 p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Settings</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Choose an AGChain project</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            Settings is a child page of the selected AGChain project or evaluation. Pick a project from the registry
            before opening project, organization, or personal partitions.
          </p>
          <Link
            to="/app/agchain/projects"
            className="mt-5 inline-flex w-fit items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Open project registry
          </Link>
        </section>
      </AgchainPageFrame>
    );
  }

  return (
    <AgchainPageFrame className="gap-6 py-8">
      <section className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Selected AGChain project</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          {(focusedProject?.project_name ?? focusedProject?.benchmark_name ?? 'Selected project')} owns this settings
          surface. The landing page locks
          the `Project`, `Organization`, and `Personal` partitions before deeper configuration pages arrive.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {SETTINGS_PARTITIONS.map((partition) => (
          <article key={partition.title} className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{partition.title}</p>
            <p className="mt-4 text-xl font-semibold tracking-tight text-foreground">{partition.title} settings</p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{partition.description}</p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
              {partition.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>

            {partition.cta ? (
              <Link
                to={partition.cta.href}
                className="mt-6 inline-flex items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {partition.cta.label}
              </Link>
            ) : (
              <div className="mt-6 inline-flex items-center rounded-full border border-border/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Placeholder partition
              </div>
            )}
          </article>
        ))}
      </section>
    </AgchainPageFrame>
  );
}
