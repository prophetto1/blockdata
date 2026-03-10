import { Field as ArkField } from '@ark-ui/react/field';
import { cn } from '@/lib/utils';

function FieldRoot({ className, ...props }: React.ComponentProps<typeof ArkField.Root>) {
  return (
    <ArkField.Root
      className={cn('flex min-h-9 items-start justify-between gap-4 py-1.5', className)}
      {...props}
    />
  );
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof ArkField.Label>) {
  return (
    <ArkField.Label
      className={cn('text-sm font-medium text-foreground', className)}
      {...props}
    />
  );
}

function FieldHelperText({ className, ...props }: React.ComponentProps<typeof ArkField.HelperText>) {
  return (
    <ArkField.HelperText
      className={cn('text-xs text-muted-foreground', className)}
      {...props}
    />
  );
}

function FieldErrorText({ className, ...props }: React.ComponentProps<typeof ArkField.ErrorText>) {
  return (
    <ArkField.ErrorText
      className={cn('text-xs text-destructive', className)}
      {...props}
    />
  );
}

export { FieldRoot, FieldLabel, FieldHelperText, FieldErrorText };
