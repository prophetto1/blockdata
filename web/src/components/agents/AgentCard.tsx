import { Badge } from '@/components/ui/badge';
import type { AgentCatalogRow } from '@/lib/types';

const btnLight = 'rounded-md px-3 py-1.5 text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors';
const btnSubtle = 'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:pointer-events-none disabled:opacity-50';

export function AgentCard({
  catalog,
  isDefault,
  configured,
  keyword,
  onConfigure,
  onSetDefault,
  canSetDefault,
  configureLabel = 'Configure',
  hideSetDefault = false,
}: {
  catalog: AgentCatalogRow;
  isDefault: boolean;
  configured: boolean;
  keyword: string;
  onConfigure: () => void;
  onSetDefault: () => void;
  canSetDefault: boolean;
  configureLabel?: string;
  hideSetDefault?: boolean;
}) {
  return (
    <div className="rounded-lg border p-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="font-bold">{catalog.display_name}</span>
            <span className="text-sm text-muted-foreground">
              {catalog.provider_family}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {isDefault && <Badge variant="blue">Default</Badge>}
            <Badge variant={configured ? 'green' : 'gray'}>
              {configured ? 'Configured' : 'Needs setup'}
            </Badge>
          </div>
        </div>

        <span className="text-sm text-muted-foreground">
          Keyword: <span className="font-semibold text-foreground">{keyword || '(none)'}</span>
        </span>

        <div className="flex items-center justify-between">
          <button type="button" className={btnLight} onClick={onConfigure}>
            {configureLabel}
          </button>
          {!hideSetDefault && (
            <button
              type="button"
              className={btnSubtle}
              onClick={onSetDefault}
              disabled={!canSetDefault || configured === false}
            >
              Make default
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
