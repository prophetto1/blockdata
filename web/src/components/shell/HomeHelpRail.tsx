import { RightRailShell, type RightRailSection } from '@/components/shell/RightRailShell';

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

export function HomeHelpRail() {
  return (
    <RightRailShell
      title="Help"
      description="In-app help and documentation guidance for platform home."
      sections={HOME_HELP_SECTIONS}
    />
  );
}
