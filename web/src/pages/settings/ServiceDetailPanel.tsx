import React, { useMemo, useState } from 'react';
import { Switch } from '@ark-ui/react/switch';
import { IconX } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import type { ServiceFunctionRow, ServiceRow } from './services-panel.types';
import { formatTimestamp } from './services-panel.types';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

type ServiceDetailPanelProps = {
  service: ServiceRow;
  functions: ServiceFunctionRow[];
  savingKey: string | null;
  onToggleServiceEnabled: (service: ServiceRow) => void;
  onToggleFunctionEnabled: (fn: ServiceFunctionRow) => void;
  onClose: () => void;
  /** When false, hides admin controls (enabled toggles). Default true. */
  isAdmin?: boolean;
};

/* ------------------------------------------------------------------ */
/*  Health badge                                                       */
/* ------------------------------------------------------------------ */

function healthBadgeClass(status: string): string {
  switch (status) {
    case 'online':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400';
    case 'degraded':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-400';
    case 'offline':
      return 'border-red-500/40 bg-red-500/10 text-red-400';
    default:
      return 'border-border bg-muted text-muted-foreground';
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ServiceDetailPanel({
  service,
  functions,
  savingKey,
  onToggleServiceEnabled,
  onToggleFunctionEnabled,
  onClose,
  isAdmin = true,
}: ServiceDetailPanelProps) {
  const [expandedParams, setExpandedParams] = useState<Set<string>>(new Set());

  const sortedFunctions = useMemo(
    () => [...functions].sort((a, b) => a.function_name.localeCompare(b.function_name)),
    [functions],
  );

  /* ---- Param expand/collapse ---- */
  const PARAM_COLLAPSE_THRESHOLD = 5;
  const toggleParamExpand = (fnId: string) => {
    setExpandedParams((prev) => {
      const next = new Set(prev);
      if (next.has(fnId)) next.delete(fnId);
      else next.add(fnId);
      return next;
    });
  };

  return (
    <div className="min-w-0 flex-1 overflow-y-auto pl-4">
      {/* ---- Header ---- */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {service.service_name}
          </h2>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono">
              {service.service_type}
            </span>
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                healthBadgeClass(service.health_status),
              )}
            >
              {service.health_status}
            </span>
            <span>Updated {formatTimestamp(service.updated_at)}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {isAdmin && (
            <div className="group relative inline-flex items-center">
              <Switch.Root
                checked={service.enabled}
                onCheckedChange={() => onToggleServiceEnabled(service)}
                className="inline-flex items-center"
              >
                <Switch.HiddenInput />
                <Switch.Control className="relative h-4 w-8 rounded-full border border-input bg-muted transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary">
                  <Switch.Thumb className="block h-3 w-3 translate-x-0 rounded-full bg-background shadow transition-transform data-[state=checked]:translate-x-4" />
                </Switch.Control>
              </Switch.Root>
              <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                {service.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <IconX size={16} />
          </button>
        </div>
      </div>

      {/* ---- Functions section ---- */}
      <div className="mt-6">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-foreground">
            Functions{' '}
            <span className="font-normal text-muted-foreground">
              ({sortedFunctions.length})
            </span>
          </h3>
        </div>

        {sortedFunctions.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No functions registered for this service.
          </p>
        )}

        {sortedFunctions.length > 0 && (
          <div className="overflow-auto rounded-md border border-border">
            <table className="min-w-full border-collapse text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Function</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Label</th>
                  <th className="px-3 py-2 font-medium">Method</th>
                  <th className="px-3 py-2 font-medium">Entrypoint</th>
                  {isAdmin && <th className="px-3 py-2 font-medium">Enabled</th>}
                </tr>
              </thead>
              <tbody>
                {sortedFunctions.map((fn) => {
                  const params = fn.parameter_schema ?? [];
                  const isExpanded = expandedParams.has(fn.function_id);
                  const visibleParams =
                    isExpanded || params.length <= PARAM_COLLAPSE_THRESHOLD
                      ? params
                      : params.slice(0, PARAM_COLLAPSE_THRESHOLD);

                  const fnToggleKey = `function:${fn.function_id}`;

                  return (
                    <React.Fragment key={fn.function_id}>
                      <tr className="border-t border-border align-top">
                        <td className="px-3 py-2 text-foreground">
                          <span className="font-mono">
                            {fn.function_name}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {fn.function_type}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {fn.label}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          <span className="font-mono">{fn.http_method}</span>
                        </td>
                        <td className="px-3 py-2 font-mono text-muted-foreground">
                          {fn.entrypoint}
                        </td>
                        {isAdmin && (
                          <td className="px-3 py-2">
                            <Switch.Root
                              checked={fn.enabled}
                              onCheckedChange={() =>
                                onToggleFunctionEnabled(fn)
                              }
                              disabled={savingKey === fnToggleKey}
                              className="inline-flex items-center"
                            >
                              <Switch.HiddenInput />
                              <Switch.Control className="relative h-4 w-8 rounded-full border border-input bg-muted transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary">
                                <Switch.Thumb className="block h-3 w-3 translate-x-0 rounded-full bg-background shadow transition-transform data-[state=checked]:translate-x-4" />
                              </Switch.Control>
                            </Switch.Root>
                          </td>
                        )}
                      </tr>

                      {/* Params sub-row */}
                      {params.length > 0 && (
                        <tr className="bg-muted/30">
                          <td colSpan={isAdmin ? 6 : 5} className="px-3 py-1.5">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span className="font-medium text-foreground/70">
                                Params:
                              </span>
                              {visibleParams.map((p) => (
                                <span
                                  key={p.name}
                                  className="inline-flex items-center gap-1"
                                >
                                  <span className="font-mono">{p.name}</span>
                                  <span className="text-muted-foreground/60">
                                    ({p.type})
                                  </span>
                                  {p.required && (
                                    <span className="rounded bg-primary/10 px-1 text-[10px] font-medium text-primary">
                                      req
                                    </span>
                                  )}
                                  {p.default !== undefined && (
                                    <span className="text-muted-foreground/50">
                                      ={String(p.default)}
                                    </span>
                                  )}
                                  {p.values && (
                                    <span className="text-muted-foreground/50">
                                      [{p.values.join('|')}]
                                    </span>
                                  )}
                                </span>
                              ))}
                              {params.length > PARAM_COLLAPSE_THRESHOLD && (
                                <button
                                  type="button"
                                  className="text-primary hover:underline"
                                  onClick={() =>
                                    toggleParamExpand(fn.function_id)
                                  }
                                >
                                  {isExpanded
                                    ? 'show less'
                                    : `+${params.length - PARAM_COLLAPSE_THRESHOLD} more`}
                                </button>
                              )}
                              {fn.result_schema && (
                                <span className="ml-auto text-muted-foreground/50">
                                  result:{' '}
                                  {Object.keys(fn.result_schema).length} keys
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
