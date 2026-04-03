import { Steps as ArkSteps } from '@ark-ui/react/steps';
import { cn } from '@/lib/utils';

/* ── Root ── */
function StepsRoot({ className, ...props }: React.ComponentProps<typeof ArkSteps.Root>) {
  return (
    <ArkSteps.Root
      className={cn('flex w-full', 'data-[orientation=horizontal]:flex-col data-[orientation=vertical]:flex-row', className)}
      data-slot="steps"
      {...props}
    />
  );
}

/* ── List ── */
function StepsList({ className, ...props }: React.ComponentProps<typeof ArkSteps.List>) {
  return (
    <ArkSteps.List
      className={cn(
        'flex',
        'data-[orientation=horizontal]:flex-row data-[orientation=horizontal]:items-center data-[orientation=horizontal]:justify-between',
        'data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-start',
        className,
      )}
      data-slot="steps-list"
      {...props}
    />
  );
}

/* ── Item ── */
function StepsItem({ className, ...props }: React.ComponentProps<typeof ArkSteps.Item>) {
  return (
    <ArkSteps.Item
      className={cn('relative flex flex-1 items-center gap-3 last:flex-initial', className)}
      data-slot="steps-item"
      {...props}
    />
  );
}

/* ── Trigger ── */
function StepsTrigger({ className, ...props }: React.ComponentProps<typeof ArkSteps.Trigger>) {
  return (
    <ArkSteps.Trigger
      className={cn(
        'flex items-center gap-3 rounded-md bg-transparent border-none p-0 text-sm font-medium text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      data-slot="steps-trigger"
      {...props}
    />
  );
}

/* ── Indicator (number/check circle) ── */
function StepsIndicator({ className, ...props }: React.ComponentProps<typeof ArkSteps.Indicator>) {
  return (
    <ArkSteps.Indicator
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
        'data-[incomplete]:border-2 data-[incomplete]:border-border data-[incomplete]:text-muted-foreground',
        'data-[current]:border-2 data-[current]:border-primary data-[current]:bg-primary/10 data-[current]:text-primary',
        'data-[complete]:border-2 data-[complete]:border-primary data-[complete]:bg-primary data-[complete]:text-primary-foreground',
        className,
      )}
      data-slot="steps-indicator"
      {...props}
    />
  );
}

/* ── Separator ── */
function StepsSeparator({ className, ...props }: React.ComponentProps<typeof ArkSteps.Separator>) {
  return (
    <ArkSteps.Separator
      className={cn(
        'mx-3 flex-1 bg-border',
        'data-[orientation=horizontal]:h-0.5',
        'data-[orientation=vertical]:w-0.5',
        'data-[state=complete]:bg-primary',
        className,
      )}
      data-slot="steps-separator"
      {...props}
    />
  );
}

/* ── Content ── */
function StepsContent({ className, ...props }: React.ComponentProps<typeof ArkSteps.Content>) {
  return (
    <ArkSteps.Content
      className={cn('text-sm', className)}
      data-slot="steps-content"
      {...props}
    />
  );
}

/* ── Completed Content ── */
function StepsCompletedContent({ className, ...props }: React.ComponentProps<typeof ArkSteps.CompletedContent>) {
  return (
    <ArkSteps.CompletedContent
      className={cn('text-sm font-medium text-primary', className)}
      data-slot="steps-completed-content"
      {...props}
    />
  );
}

/* ── Prev Trigger ── */
function StepsPrevTrigger({ className, ...props }: React.ComponentProps<typeof ArkSteps.PrevTrigger>) {
  return (
    <ArkSteps.PrevTrigger
      className={cn(className)}
      data-slot="steps-prev-trigger"
      {...props}
    />
  );
}

/* ── Next Trigger ── */
function StepsNextTrigger({ className, ...props }: React.ComponentProps<typeof ArkSteps.NextTrigger>) {
  return (
    <ArkSteps.NextTrigger
      className={cn(className)}
      data-slot="steps-next-trigger"
      {...props}
    />
  );
}

export {
  StepsRoot,
  StepsList,
  StepsItem,
  StepsTrigger,
  StepsIndicator,
  StepsSeparator,
  StepsContent,
  StepsCompletedContent,
  StepsPrevTrigger,
  StepsNextTrigger,
};
