import { Dialog as ArkDialog } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const DialogRoot = ArkDialog.Root;

function DialogTrigger({
  className,
  ...props
}: ArkDialog.TriggerProps) {
  return <ArkDialog.Trigger className={cn(className)} {...props} />;
}

function DialogBackdrop({
  className,
  ...props
}: ArkDialog.BackdropProps) {
  return (
    <ArkDialog.Backdrop
      className={cn(
        'fixed inset-0 z-50 bg-black/40',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        className,
      )}
      {...props}
    />
  );
}

function DialogPositioner({
  className,
  ...props
}: ArkDialog.PositionerProps) {
  return (
    <ArkDialog.Positioner
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        'overscroll-y-none',
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  ...props
}: ArkDialog.ContentProps) {
  return (
    <Portal>
      <DialogBackdrop />
      <DialogPositioner>
        <ArkDialog.Content
          className={cn(
            'relative flex w-96 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] flex-col rounded-lg border border-border bg-popover p-6 shadow-lg outline-none',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            className,
          )}
          {...props}
        >
          {children}
        </ArkDialog.Content>
      </DialogPositioner>
    </Portal>
  );
}

function DialogTitle({
  className,
  ...props
}: ArkDialog.TitleProps) {
  return (
    <ArkDialog.Title
      className={cn('text-lg font-semibold leading-7 text-foreground', className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: ArkDialog.DescriptionProps) {
  return (
    <ArkDialog.Description
      className={cn('mt-1 text-sm leading-relaxed text-muted-foreground', className)}
      {...props}
    />
  );
}

function DialogCloseTrigger({
  className,
  ...props
}: ArkDialog.CloseTriggerProps) {
  return (
    <ArkDialog.CloseTrigger
      className={cn(
        'absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded border-none bg-transparent text-muted-foreground',
        'transition-colors hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'cursor-pointer',
        className,
      )}
      {...props}
    >
      <XIcon className="h-4 w-4" />
    </ArkDialog.CloseTrigger>
  );
}

function DialogBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mt-5 flex w-full flex-col gap-3', className)}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mt-6 flex justify-end gap-3', className)}
      {...props}
    />
  );
}

export {
  DialogRoot,
  DialogTrigger,
  DialogBackdrop,
  DialogPositioner,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogCloseTrigger,
  DialogBody,
  DialogFooter,
};
