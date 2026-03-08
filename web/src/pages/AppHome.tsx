import { useMemo } from 'react';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { useRightRail } from '@/components/shell/RightRailContext';
import type { RightRailSection } from '@/components/shell/RightRailShell';

const HOME_HELP_SECTIONS: RightRailSection[] = [
  {
    title: 'Getting started',
    items: [
      {
        eyebrow: 'Overview',
        title: 'Platform home help rail',
        description: 'This right rail is reserved for in-app guidance, onboarding notes, and curated help content.',
      },
      {
        eyebrow: 'Next',
        title: 'Add your landing guidance',
        description: 'We can replace these placeholders with real help copy, internal references, and documentation links.',
      },
    ],
  },
  {
    title: 'Documentation',
    items: [
      {
        eyebrow: 'Docs',
        title: 'Curated documentation slot',
        description: 'Use this area for the most relevant help topics tied to platform home and first-run navigation.',
      },
    ],
  },
];

export default function AppHome() {
  useShellHeaderTitle({ title: 'Home', breadcrumbs: ['Home'] });

  const rightRailContent = useMemo(() => ({
    title: 'Help',
    description: 'In-app help and documentation guidance for platform home.',
    sections: HOME_HELP_SECTIONS,
  }), []);

  useRightRail(rightRailContent);

  return (
    <div className="flex h-full min-h-0 flex-col p-6">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6">
        <section className="rounded-xl border border-border bg-card px-6 py-8 shadow-sm">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              BlockData
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Authenticated landing page
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              This is the shell home surface. We can add your landing cards and the right-side Help
              rail content here next without changing the routing model again.
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="min-h-[220px] rounded-xl border border-dashed border-border bg-card/60 p-6">
            <p className="text-sm font-medium text-foreground">Card slot 1</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Reserved for the first landing card.
            </p>
          </div>

          <div className="min-h-[220px] rounded-xl border border-dashed border-border bg-card/60 p-6">
            <p className="text-sm font-medium text-foreground">Card slot 2</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Reserved for the second landing card.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
