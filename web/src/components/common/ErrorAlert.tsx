import { AlertCircleIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

export function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="mt-3 flex items-start gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
      <HugeiconsIcon icon={AlertCircleIcon} size={18} strokeWidth={1.8} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
