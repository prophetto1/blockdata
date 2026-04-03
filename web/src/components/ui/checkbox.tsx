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
        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[#3a3a3a] bg-transparent transition-colors',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        'data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground',
        'data-[focus-visible]:outline-2 data-[focus-visible]:outline-[#e2503f] data-[focus-visible]:outline-offset-2',
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
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7l3 3 5-5.5" />
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
