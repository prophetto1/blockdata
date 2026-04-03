import { Progress as ArkProgress } from '@ark-ui/react/progress';
import { cn } from '@/lib/utils';

function ProgressRoot({ className, ...props }: React.ComponentProps<typeof ArkProgress.Root>) {
  return (
    <ArkProgress.Root
      className={cn('flex w-full flex-col gap-1.5', className)}
      data-slot="progress"
      {...props}
    />
  );
}

function ProgressLabel({ className, ...props }: React.ComponentProps<typeof ArkProgress.Label>) {
  return (
    <ArkProgress.Label
      className={cn('text-sm font-medium text-foreground', className)}
      data-slot="progress-label"
      {...props}
    />
  );
}

function ProgressTrack({ className, ...props }: React.ComponentProps<typeof ArkProgress.Track>) {
  return (
    <ArkProgress.Track
      className={cn('h-2 w-full overflow-hidden rounded-full bg-white/5', className)}
      data-slot="progress-track"
      {...props}
    />
  );
}

function ProgressRange({ className, ...props }: React.ComponentProps<typeof ArkProgress.Range>) {
  return (
    <ArkProgress.Range
      className={cn('h-full rounded-full bg-primary transition-[width] duration-300', className)}
      data-slot="progress-range"
      {...props}
    />
  );
}

function ProgressValueText({ className, ...props }: React.ComponentProps<typeof ArkProgress.ValueText>) {
  return (
    <ArkProgress.ValueText
      className={cn('text-sm text-muted-foreground', className)}
      data-slot="progress-value-text"
      {...props}
    />
  );
}

function ProgressCircle({ className, ...props }: React.ComponentProps<typeof ArkProgress.Circle>) {
  return (
    <ArkProgress.Circle
      className={cn(className)}
      data-slot="progress-circle"
      {...props}
    />
  );
}

function ProgressCircleTrack({ className, ...props }: React.ComponentProps<typeof ArkProgress.CircleTrack>) {
  return (
    <ArkProgress.CircleTrack
      className={cn('stroke-white/10', className)}
      data-slot="progress-circle-track"
      {...props}
    />
  );
}

function ProgressCircleRange({ className, ...props }: React.ComponentProps<typeof ArkProgress.CircleRange>) {
  return (
    <ArkProgress.CircleRange
      className={cn('stroke-primary transition-[stroke-dashoffset] duration-300', className)}
      data-slot="progress-circle-range"
      {...props}
    />
  );
}

function ProgressView({ className, ...props }: React.ComponentProps<typeof ArkProgress.View>) {
  return (
    <ArkProgress.View
      className={cn(className)}
      data-slot="progress-view"
      {...props}
    />
  );
}

export {
  ProgressRoot,
  ProgressLabel,
  ProgressTrack,
  ProgressRange,
  ProgressValueText,
  ProgressCircle,
  ProgressCircleTrack,
  ProgressCircleRange,
  ProgressView,
};
