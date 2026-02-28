import { Badge } from '@/components/ui/badge';
import type { McpServerDef } from '@/components/mcp/mcp-catalog';

const btnLight = 'rounded-md px-3 py-1.5 text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors';

export function McpServerCard({
  server,
  status,
  actionLabel,
  onAction,
}: {
  server: McpServerDef;
  status: 'connected' | 'disconnected' | 'configure';
  actionLabel?: string;
  onAction?: () => void;
}) {
  const badgeVariant = status === 'connected' ? 'green' : status === 'configure' ? 'blue' : 'gray';
  const badgeText = status === 'connected' ? 'Connected' : status === 'configure' ? 'Configure' : 'Not connected';

  return (
    <div className="rounded-lg border p-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="font-bold">{server.title}</span>
            <span className="text-sm text-muted-foreground">
              {server.description}
            </span>
          </div>
          <Badge variant={badgeVariant}>
            {badgeText}
          </Badge>
        </div>
        {actionLabel && onAction && (
          <div className="flex justify-end">
            <button type="button" className={btnLight} onClick={onAction}>
              {actionLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
