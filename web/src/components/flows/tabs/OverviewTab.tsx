import type { ComponentType } from 'react';
import {
  IconAdjustmentsHorizontal,
  IconBook2,
  IconPlayerPlay,
  IconRocket,
} from '@tabler/icons-react';
import { AppIcon } from '@/components/ui/app-icon';
import { Button } from '@/components/ui/button';

type ResourceCard = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

const RESOURCE_CARDS: ResourceCard[] = [
  {
    title: 'Get Started',
    description: 'Follow the BlockData quickstart to wire your first flow and understand the execution path.',
    icon: IconRocket,
  },
  {
    title: 'Flow Components',
    description: 'Review the core orchestration pieces that shape a flow, from triggers through task execution.',
    icon: IconAdjustmentsHorizontal,
  },
  {
    title: 'Video Tutorials',
    description: 'Walk through common setup and execution patterns with guided examples and video walkthroughs.',
    icon: IconBook2,
  },
];

export function OverviewTab({ onExecute }: { onExecute: () => void }) {
  return (
    <div className="flex min-h-full items-center justify-center px-6 py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center text-center">
        <div className="relative mb-8 flex h-40 w-56 items-center justify-center">
          <div className="absolute inset-x-8 bottom-5 h-10 rounded-full bg-primary/12 blur-2xl" />
          <div className="absolute inset-x-10 inset-y-5 rounded-[2rem] border border-border/70 bg-accent/30 blur-md" />
          <div className="absolute flex h-24 w-40 -rotate-[28deg] items-center justify-center rounded-[1.7rem] border border-border bg-card shadow-[0_18px_40px_rgba(15,23,42,0.16)]" />
          <div className="relative flex h-24 w-40 -rotate-[28deg] items-center justify-center rounded-[1.7rem] border border-primary/30 bg-card shadow-[0_24px_48px_rgba(15,23,42,0.18)]">
            <div className="absolute inset-[0.45rem] rounded-[1.35rem] border border-border bg-gradient-to-br from-background via-card to-accent/40" />
            <div className="relative flex items-center gap-2 rounded-xl border border-border bg-background/90 px-3 py-2 text-foreground shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <AppIcon icon={IconPlayerPlay} context="inline" tone="accent" />
              </span>
              <span className="text-sm font-semibold tracking-tight">Execute</span>
            </div>
          </div>
        </div>

        <h2 className="text-4xl font-semibold tracking-tight text-foreground">
          Start your first flow execution
        </h2>
        <p className="mt-4 max-w-2xl text-xl leading-8 text-muted-foreground">
          Click Execute to launch this flow, then use executions, logs, metrics, and revisions to follow it end to end.
        </p>

        <Button
          type="button"
          size="lg"
          className="mt-8 min-w-64 text-base shadow-lg shadow-primary/15"
          onClick={onExecute}
        >
          <IconPlayerPlay className="h-4 w-4 fill-current" />
          Execute
        </Button>

        <div className="mt-16 flex w-full items-center gap-6 text-sm text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          <span>Need help getting this flow moving?</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="mt-8 grid w-full gap-4 md:grid-cols-3">
          {RESOURCE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="relative rounded-2xl border border-border bg-card/95 px-6 py-6 text-left shadow-sm transition-colors hover:bg-accent/20"
              >
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-foreground">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
