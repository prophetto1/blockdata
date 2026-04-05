import { IconChecklist, IconRoute, IconTool } from '@tabler/icons-react';

import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import FlowCanvas from '@/components/flows/FlowCanvas';
import type { FlowTask } from '@/components/flows/nocode/flow-document';

type Pillar = {
  title: string;
  description: string;
  icon: typeof IconChecklist;
  bullets: string[];
};

const PILLARS: Pillar[] = [
  {
    title: 'Plan Contract',
    description: 'Approved implementation plans define the locked backend, lifecycle, metadata, and scope contracts before execution starts.',
    icon: IconChecklist,
    bullets: [
      'Plan approval is the source contract for execution.',
      'Frontend work must not reinterpret backend seams after approval.',
      'Locked states, metadata, and workflow rules stay fixed during implementation.',
    ],
  },
  {
    title: 'Instruction Layer',
    description: 'Frontend design instructions translate the approved plan into execution-grade UI work: persistent scaffolds, placeholder mode, reuse audit, and verification states.',
    icon: IconRoute,
    bullets: [
      'Reuse tokens, primitives, and mounted layout patterns first.',
      'Keep pane identity persistent and move empty states inside the scaffold.',
      'Define no-selection, placeholder, and selected-state visibility before wiring live data.',
    ],
  },
  {
    title: 'Execution Discipline',
    description: 'Workers execute against the plan and the instruction document together, then prove the result with tests and browser verification.',
    icon: IconTool,
    bullets: [
      'Implementation follows the approved plan without scope drift.',
      'Frontend verification includes browser-visible structure, not only logic and tests.',
      'Cross-worker analysis becomes easier because outputs and source snapshots are saved deterministically.',
    ],
  },
];

const GENERIC_CANVAS_TASKS: FlowTask[] = [
  {
    id: 'lock-approved-plan',
    type: 'workflow.plan.contract',
    description: 'Approved plan defines the source contract.',
  },
  {
    id: 'write-frontend-instruction',
    type: 'workflow.frontend.instruction',
    description: 'Instruction layer translates the plan into executable UI work.',
  },
  {
    id: 'execute-and-verify',
    type: 'workflow.execution.verify',
    description: 'Workers implement against the instruction and verify structure in-browser.',
  },
];

function PillarCard({ title, description, icon: Icon, bullets }: Pillar) {
  return (
    <section className="rounded-[24px] border border-border/70 bg-card/80 px-5 py-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl border border-border bg-background p-3 text-foreground">
          <Icon aria-hidden="true" className="h-5 w-5" stroke={1.8} />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>

      <ul className="mt-5 space-y-3">
        {bullets.map((bullet) => (
          <li key={bullet} className="rounded-xl border border-border/70 bg-background px-4 py-3 text-sm text-foreground">
            {bullet}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Component() {
  useShellHeaderTitle({
    title: 'Skill-Driven Dev',
    breadcrumbs: ['Superuser', 'Skill-Driven Dev'],
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
      <header className="rounded-[28px] border border-border/70 bg-card/75 px-5 py-5 shadow-sm md:px-6">
        <div className="max-w-4xl space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Superuser Workflow Surface
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground" style={{ textWrap: 'balance' }}>
            Skill-Driven Dev
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            This page anchors the execution model where approved plans define the contract, instruction documents translate that contract into concrete frontend work, and implementation is verified against both.
          </p>
        </div>
      </header>

      <section className="grid gap-5 xl:grid-cols-3">
        {PILLARS.map((pillar) => (
          <PillarCard key={pillar.title} {...pillar} />
        ))}
      </section>

      <section className="rounded-[28px] border border-border/70 bg-card/80 px-5 py-5 shadow-sm md:px-6">
        <div className="max-w-4xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Generic Canvas Surface
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
            Eternity Canvas Surface
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This embeds the existing ReactFlow-based canvas as a generic skill-driven development surface. It is seeded
            with a simple three-step contract-to-execution path for now, while keeping the page ready for a richer
            future workbench if you decide to evolve this route beyond documentation and workflow guidance.
          </p>
        </div>

        <div className="mt-6 overflow-hidden rounded-[24px] border border-border bg-background">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Canvas Workspace</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Generic ReactFlow setup reusing the active flows canvas component.
            </p>
          </div>
          <div className="h-[520px]" data-testid="skill-driven-dev-canvas">
            <FlowCanvas tasks={GENERIC_CANVAS_TASKS} />
          </div>
        </div>
      </section>
    </main>
  );
}
