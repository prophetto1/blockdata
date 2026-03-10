import { NumberInput as ArkNumberInput } from '@ark-ui/react/number-input';
import { cn } from '@/lib/utils';

function NumberInputRoot({ className, ...props }: React.ComponentProps<typeof ArkNumberInput.Root>) {
  return (
    <ArkNumberInput.Root
      className={cn('inline-flex items-center', className)}
      {...props}
    />
  );
}

function NumberInputInput({ className, ...props }: React.ComponentProps<typeof ArkNumberInput.Input>) {
  return (
    <ArkNumberInput.Input
      className={cn(
        'h-8 w-24 rounded-md border border-input bg-background px-2 text-xs text-foreground',
        className,
      )}
      {...props}
    />
  );
}

export { NumberInputRoot, NumberInputInput };
