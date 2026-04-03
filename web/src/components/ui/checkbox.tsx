import { Checkbox as ArkCheckbox } from '@ark-ui/react/checkbox';
import { cn } from '@/lib/utils';

function CheckboxRoot({
  className,
  ...props
}: React.ComponentProps<typeof ArkCheckbox.Root>) {
  return (
    <ArkCheckbox.Root
      className={cn('inline-flex items-center gap-2', className)}
      data-slot="checkbox"
      {...props}
    />
  );
}

function CheckboxControl({
  className,
  ...props
}: React.ComponentProps<typeof ArkCheckbox.Control>) {
  return (
    <ArkCheckbox.Control
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded border border-input bg-background transition-colors',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        'data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

function CheckboxIndicator({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ArkCheckbox.Indicator>) {
  return (
    <ArkCheckbox.Indicator
      className={cn('flex items-center justify-center text-current', className)}
      {...props}
    >
      {children ?? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 6l2.5 2.5 4.5-5" />
        </svg>
      )}
    </ArkCheckbox.Indicator>
  );
}

function CheckboxLabel({
  className,
  ...props
}: React.ComponentProps<typeof ArkCheckbox.Label>) {
  return (
    <ArkCheckbox.Label
      className={cn('text-sm font-medium leading-none', className)}
      {...props}
    />
  );
}

const CheckboxHiddenInput = ArkCheckbox.HiddenInput;

export { CheckboxRoot, CheckboxControl, CheckboxIndicator, CheckboxLabel, CheckboxHiddenInput };
