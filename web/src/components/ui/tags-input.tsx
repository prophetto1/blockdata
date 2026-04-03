import { TagsInput as ArkTagsInput } from '@ark-ui/react/tags-input';
import { cn } from '@/lib/utils';

function TagsInputRoot({ className, ...props }: React.ComponentProps<typeof ArkTagsInput.Root>) {
  return (
    <ArkTagsInput.Root
      className={cn('flex w-full flex-col gap-1.5', className)}
      data-slot="tags-input"
      {...props}
    />
  );
}

function TagsInputContext(props: React.ComponentProps<typeof ArkTagsInput.Context>) {
  return <ArkTagsInput.Context {...props} />;
}

function TagsInputLabel({ className, ...props }: React.ComponentProps<typeof ArkTagsInput.Label>) {
  return (
    <ArkTagsInput.Label
      className={cn('text-sm font-medium text-foreground', className)}
      data-slot="tags-input-label"
      {...props}
    />
  );
}

function TagsInputControl({ className, ...props }: React.ComponentProps<typeof ArkTagsInput.Control>) {
  return (
    <ArkTagsInput.Control
      className={cn(
        'relative flex flex-wrap items-center gap-1 rounded-md border border-[#3a3a3a] bg-transparent px-2 py-1.5',
        'focus-within:border-primary focus-within:shadow-[0_0_0_1px_var(--primary)]',
        'data-[disabled]:opacity-50',
        className,
      )}
      data-slot="tags-input-control"
      {...props}
    />
  );
}

function TagsInputItem({ className, ...props }: React.ComponentProps<typeof ArkTagsInput.Item>) {
  return (
    <ArkTagsInput.Item
      className={cn('inline-flex items-center outline-none', className)}
      data-slot="tags-input-item"
      {...props}
    />
  );
}

function TagsInputItemPreview({ className, ...props }: React.ComponentProps<typeof ArkTagsInput.ItemPreview>) {
  return (
    <ArkTagsInput.ItemPreview
      className={cn(
        'inline-flex items-center gap-1 rounded px-2 py-0.5 text-sm bg-white/5 text-foreground',
        'data-[highlighted]:bg-primary data-[highlighted]:text-primary-foreground',
        className,
      )}
      data-slot="tags-input-item-preview"
      {...props}
    />
  );
}

function TagsInputItemText({ className, ...props }: React.ComponentProps<typeof ArkTagsInput.ItemText>) {
  return (
    <ArkTagsInput.ItemText
      className={cn('font-medium', className)}
      data-slot="tags-input-item-text"
      {...props}
    />
  );
}

function TagsInputItemDeleteTrigger({ className, ...props }: React.ComponentProps<typeof ArkTagsInput.ItemDeleteTrigger>) {
  return (
    <ArkTagsInput.ItemDeleteTrigger
      className={cn('inline-flex items-center justify-center rounded p-0.5 bg-transparent border-0 text-current hover:text-destructive', className)}
      data-slot="tags-input-item-delete-trigger"
      {...props}
    />
  );
}

function TagsInputItemInput({ className, ...props }: React.ComponentProps<typeof ArkTagsInput.ItemInput>) {
  return (
    <ArkTagsInput.ItemInput
      className={cn('min-w-16 rounded border border-[#3a3a3a] bg-white/5 px-2 py-0.5 text-sm text-foreground outline-none', className)}
      data-slot="tags-input-item-input"
      {...props}
    />
  );
}

function TagsInputInput({ className, ...props }: React.ComponentProps<typeof ArkTagsInput.Input>) {
  return (
    <ArkTagsInput.Input
      className={cn(
        'min-w-16 flex-1 bg-transparent border-0 px-1 py-0.5 text-sm text-foreground outline-none',
        'placeholder:text-muted-foreground',
        className,
      )}
      data-slot="tags-input-input"
      {...props}
    />
  );
}

function TagsInputClearTrigger({ className, ...props }: React.ComponentProps<typeof ArkTagsInput.ClearTrigger>) {
  return (
    <ArkTagsInput.ClearTrigger
      className={cn(
        'absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded p-1',
        'bg-transparent border-0 text-muted-foreground hover:text-foreground',
        className,
      )}
      data-slot="tags-input-clear-trigger"
      {...props}
    />
  );
}

function TagsInputHiddenInput(props: React.ComponentProps<typeof ArkTagsInput.HiddenInput>) {
  return <ArkTagsInput.HiddenInput {...props} />;
}

export {
  TagsInputRoot,
  TagsInputContext,
  TagsInputLabel,
  TagsInputControl,
  TagsInputItem,
  TagsInputItemPreview,
  TagsInputItemText,
  TagsInputItemDeleteTrigger,
  TagsInputItemInput,
  TagsInputInput,
  TagsInputClearTrigger,
  TagsInputHiddenInput,
};
