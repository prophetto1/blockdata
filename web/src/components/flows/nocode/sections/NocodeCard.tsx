import { IconInfoCircle } from '@tabler/icons-react';

type Props = {
  name: string;
  typeBadge: string;
  info?: string;
  children: React.ReactNode;
};

export function NocodeCard({ name, typeBadge, info, children }: Props) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground">{name}</span>
          {info && (
            <span title={info}>
              <IconInfoCircle size={14} className="text-primary/60" />
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{typeBadge}</span>
      </div>
      {children}
    </div>
  );
}
