import { useEffect, useState } from 'react';
import { AlertCircleIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

export function ErrorAlert({ message }: { message: string }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
  }, [message]);

  if (dismissed) return null;

  return (
    <div className="mt-3 flex justify-center">
      <div
        role="alert"
        className="inline-flex w-fit max-w-[min(90vw,56rem)] items-start gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
      >
        <HugeiconsIcon icon={AlertCircleIcon} size={18} strokeWidth={1.8} className="mt-0.5 shrink-0" />
        <span className="break-words">{message}</span>
        <button
          type="button"
          aria-label="Dismiss error"
          className="ml-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setDismissed(true)}
        >
          <span aria-hidden="true" className="leading-none">×</span>
        </button>
      </div>
    </div>
  );
}
