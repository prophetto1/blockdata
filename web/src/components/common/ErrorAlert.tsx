import { IconAlertCircle } from '@tabler/icons-react';

export function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="mt-3 flex items-start gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
      <IconAlertCircle size={18} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
