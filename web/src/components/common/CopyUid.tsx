import { useCallback, useState } from 'react';

type CopyUidProps = {
  /** The full value to copy to clipboard */
  value: string;
  /** The truncated display label (defaults to value) */
  display?: string;
  /** Extra class name */
  className?: string;
};

/** Truncated UID with click-to-copy and tooltip feedback. */
export function CopyUid({ value, display, className }: CopyUidProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [value]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copied' : value}
      className={`cursor-pointer bg-transparent border-none p-0 font-mono text-sm ${copied ? 'text-emerald-500' : 'text-foreground'} hover:underline ${className ?? ''}`}
    >
      {display ?? value}
    </button>
  );
}
