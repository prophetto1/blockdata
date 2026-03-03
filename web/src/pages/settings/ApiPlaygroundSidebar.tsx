import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ServiceFunctionRow, ServiceRow, ServiceTypeRow } from './services-panel.types';
import { relativeTime } from './api-playground-shared';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

type ApiPlaygroundSidebarProps = {
  services: ServiceRow[];
  functions: ServiceFunctionRow[];
  serviceTypes: ServiceTypeRow[];
  selectedServiceId: string | null;
  onSelectService: (id: string | null) => void;
  loading: boolean;
};

/* ------------------------------------------------------------------ */
/*  Health dot color                                                    */
/* ------------------------------------------------------------------ */

function healthDotClass(status: string): string {
  switch (status) {
    case 'online':
      return 'bg-emerald-500';
    case 'degraded':
      return 'bg-amber-500';
    case 'offline':
      return 'bg-red-500';
    default:
      return 'bg-muted-foreground/40';
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ApiPlaygroundSidebar({
  services,
  functions,
  serviceTypes: _serviceTypes,
  selectedServiceId,
  onSelectService,
  loading,
}: ApiPlaygroundSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  /* Function count by service */
  const fnCountByService = useMemo(() => {
    const map = new Map<string, number>();
    for (const fn of functions) {
      map.set(fn.service_id, (map.get(fn.service_id) ?? 0) + 1);
    }
    return map;
  }, [functions]);

  /* Filtered list */
  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return services;
    const q = searchQuery.trim().toLowerCase();
    const matchingIds = new Set<string>();
    for (const s of services) {
      if (
        s.service_name.toLowerCase().includes(q) ||
        s.service_type.toLowerCase().includes(q) ||
        s.base_url.toLowerCase().includes(q)
      ) {
        matchingIds.add(s.service_id);
      }
    }
    for (const fn of functions) {
      if (
        fn.function_name.toLowerCase().includes(q) ||
        fn.label.toLowerCase().includes(q) ||
        (fn.description ?? '').toLowerCase().includes(q) ||
        fn.function_type.toLowerCase().includes(q) ||
        (fn.tags ?? []).some((t) => t.toLowerCase().includes(q)) ||
        (fn.source_task_class ?? '').toLowerCase().includes(q) ||
        (fn.plugin_group ?? '').toLowerCase().includes(q)
      ) {
        matchingIds.add(fn.service_id);
      }
    }
    return services.filter((s) => matchingIds.has(s.service_id));
  }, [services, functions, searchQuery]);

  return (
    <nav className="flex w-56 shrink-0 flex-col overflow-hidden border-r border-border pr-2">
      {/* Search */}
      <div className="border-b border-border px-1 pb-2 pt-1">
        <input
          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="Search services..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
        />
      </div>

      {/* Service list */}
      <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto py-1">
        {filteredServices.map((service) => {
          const fnCount = fnCountByService.get(service.service_id) ?? 0;
          const isActive = service.service_id === selectedServiceId;
          return (
            <li key={service.service_id}>
              <button
                type="button"
                onClick={() =>
                  onSelectService(isActive ? null : service.service_id)
                }
                className={cn(
                  'flex w-full flex-col gap-0.5 rounded-md px-2.5 py-1.5 text-left transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
              >
                <span className="truncate text-sm font-medium">
                  {service.service_name}
                </span>
                <span className="flex items-center gap-1.5 text-[10px]">
                  <span className="rounded bg-muted px-1 py-px font-mono">
                    {service.service_type}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className={cn(
                          'inline-block h-1.5 w-1.5 rounded-full',
                          healthDotClass(service.health_status),
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent className="px-2 py-1 text-xs">
                      {service.health_status}
                    </TooltipContent>
                  </Tooltip>
                  {fnCount > 0 && (
                    <span className="text-muted-foreground/70">
                      {fnCount} fn{fnCount !== 1 ? 's' : ''}
                    </span>
                  )}
                  {!service.enabled && (
                    <span className="text-muted-foreground/50">disabled</span>
                  )}
                  <span className="text-muted-foreground/50">
                    {relativeTime(service.last_heartbeat)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        {filteredServices.length === 0 && !loading && (
          <li className="px-2.5 py-2 text-xs text-muted-foreground">
            {services.length === 0
              ? 'No services registered.'
              : 'No services match filter.'}
          </li>
        )}
      </ul>
    </nav>
  );
}