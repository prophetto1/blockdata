import { IconArrowLeft } from '@tabler/icons-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FLOWS_SHELL_ITEMS } from '@/components/flows/flows-shell-config';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

function buildFlowDetailPath(namespace: string, flowId: string, tab: string): string {
  return `/app/flows/${encodeURIComponent(namespace)}/${encodeURIComponent(flowId)}/${tab}`;
}

export function FlowsDetailRail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { namespace, flowId } = useParams<{ namespace: string; flowId: string }>();

  if (!namespace || !flowId) return null;

  return (
    <nav aria-label="Flows detail navigation" className="flex h-full flex-col bg-background">
      <div className="border-b border-border px-3 py-3">
        <button
          type="button"
          aria-label="Back to Flows"
          onClick={() => navigate('/app/flows')}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <IconArrowLeft size={16} stroke={1.75} className="shrink-0" />
          <span>Back to Flows</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto px-2 py-2">
        <Tabs
          value={FLOWS_SHELL_ITEMS.find((item) => {
            const path = buildFlowDetailPath(namespace, flowId, item.tab);
            return location.pathname === path || location.pathname.startsWith(`${path}/`);
          })?.tab ?? 'overview'}
          onValueChange={(tab) => navigate(buildFlowDetailPath(namespace, flowId, tab))}
        >
          <TabsList className="flex flex-col gap-0.5">
            {FLOWS_SHELL_ITEMS.map((item) => {
              const ItemIcon = item.icon;
              return (
                <TabsTrigger
                  key={item.tab}
                  value={item.tab}
                  className={cn(
                    'flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-sm leading-snug transition-colors',
                    'data-[selected]:bg-accent data-[selected]:text-accent-foreground data-[selected]:font-medium',
                    'text-foreground/75 hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  <ItemIcon size={16} stroke={1.75} className="shrink-0" />
                  <span className="truncate">{item.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>
    </nav>
  );
}
