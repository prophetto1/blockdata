import { Switch } from '@ark-ui/react/switch';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Ark UI Switch wrapper                                              */
/*  Matches the pattern from setting-card-shared.tsx lines 144-157     */
/* ------------------------------------------------------------------ */

function SwitchRoot({
  className,
  ...props
}: React.ComponentProps<typeof Switch.Root>) {
  return (
    <Switch.Root
      className={cn('inline-flex items-center gap-2', className)}
      {...props}
    />
  );
}

function SwitchControl({
  className,
  ...props
}: React.ComponentProps<typeof Switch.Control>) {
  return (
    <Switch.Control
      className={cn(
        'relative h-6 w-11 rounded-full border border-[#3a3a3a] bg-white/5 transition-colors',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary',
        className,
      )}
      {...props}
    />
  );
}

function SwitchThumb({
  className,
  ...props
}: React.ComponentProps<typeof Switch.Thumb>) {
  return (
    <Switch.Thumb
      className={cn(
        'block h-5 w-5 translate-x-0 rounded-full bg-white shadow-md shadow-black/20 transition-transform',
        'data-[state=checked]:translate-x-5',
        className,
      )}
      {...props}
    />
  );
}

const SwitchLabel = Switch.Label;
const SwitchHiddenInput = Switch.HiddenInput;

export { SwitchRoot, SwitchControl, SwitchThumb, SwitchLabel, SwitchHiddenInput };
