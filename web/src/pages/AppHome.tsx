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
    <div className="flex h-full min-h-0 flex-col gap-4 px-6 py-5">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold text-foreground">Home</h1>
        <span className="text-xs text-muted-foreground">Authenticated landing · placeholder until real content is wired</span>
      </header>

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-dashed border-border bg-card/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Slot 1</p>
          <p className="mt-1 text-sm text-muted-foreground">Reserved for the first landing card.</p>
        </div>
        <div className="rounded-md border border-dashed border-border bg-card/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Slot 2</p>
          <p className="mt-1 text-sm text-muted-foreground">Reserved for the second landing card.</p>
        </div>
      </section>
    </div>
  );
}
