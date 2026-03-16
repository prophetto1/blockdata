import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IconChevronRight } from '@tabler/icons-react';
import { ArrowLeft02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import type { ServiceFunctionRow, ServiceRow } from '@/pages/settings/services-panel.types';
import { getServiceTypeLabel } from '@/pages/settings/services-panel.types';
import {
  CopyButton,
  FunctionReferenceBody,
  FunctionReferenceHeader,
  JsonBlock,
  Pill,
  SectionLabel,
  isNonEmptyObject,
} from '@/components/services/function-reference';

/* ================================================================== */
/*  PAGE                                                               */
/* ================================================================== */

type ServiceDetail = ServiceRow & { service_type_label: string };

export default function ServiceDetailPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();

  const [service, setService] = useState<ServiceDetail | null>(null);
  const [functions, setFunctions] = useState<ServiceFunctionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFunctionId, setSelectedFunctionId] = useState<string | null>(null);
  const [serviceConfigOpen, setServiceConfigOpen] = useState(false);
  const [serviceAuthConfigOpen, setServiceAuthConfigOpen] = useState(false);
  const [functionQuery, setFunctionQuery] = useState('');
  const [selectedFunctionType, setSelectedFunctionType] = useState('all');

  useEffect(() => {
    if (!serviceId) return;

    async function load() {
      setLoading(true);
      setError(null);
      setSelectedFunctionId(null);

      const [svcRes, fnRes] = await Promise.all([
        supabase
          .from('service_registry')
          .select('*')
          .eq('service_id', serviceId)
          .single(),
        supabase
          .from('service_functions')
          .select('*')
          .eq('service_id', serviceId!)
          .eq('enabled', true)
          .order('function_name'),
      ]);

      if (svcRes.error) {
        setError(svcRes.error.message);
        setLoading(false);
        return;
      }
      if (fnRes.error) {
        setError(fnRes.error.message);
        setLoading(false);
        return;
      }

      const raw = svcRes.data;
      setService({ ...(raw as unknown as ServiceRow), service_type_label: getServiceTypeLabel(raw.service_type) });
      setFunctions((fnRes.data ?? []) as ServiceFunctionRow[]);
      setLoading(false);
    }

    void load();
  }, [serviceId]);

  const baseUrl = service?.base_url ?? '';

  const functionTypeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const fn of functions) {
      counts.set(fn.function_type, (counts.get(fn.function_type) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [functions]);

  const filteredFunctions = useMemo(() => {
    const normalizedQuery = functionQuery.trim().toLowerCase();
    return functions.filter((fn) => {
      if (selectedFunctionType !== 'all' && fn.function_type !== selectedFunctionType) return false;
      if (!normalizedQuery) return true;

      const haystack = [
        fn.function_name,
        fn.label,
        fn.description ?? '',
        fn.function_type,
        ...(fn.tags ?? []),
      ].join(' ').toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [functionQuery, functions, selectedFunctionType]);

  const selectedFn = filteredFunctions.find((fn) => fn.function_id === selectedFunctionId) ?? null;

  useEffect(() => {
    if (filteredFunctions.length === 0) {
      if (selectedFunctionId !== null) {
        setSelectedFunctionId(null);
      }
      return;
    }
    if (!selectedFunctionId || !filteredFunctions.some((fn) => fn.function_id === selectedFunctionId)) {
      setSelectedFunctionId(filteredFunctions[0]!.function_id);
    }
  }, [filteredFunctions, selectedFunctionId]);

  useEffect(() => {
    setServiceConfigOpen(false);
    setServiceAuthConfigOpen(false);
    setFunctionQuery('');
    setSelectedFunctionType('all');
  }, [serviceId]);

  return (
    <div className="h-full w-full min-h-0 p-2">
      <PageHeader title={service?.service_name ?? 'Service Detail'} />
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">

        {loading && (
          <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
            Loading...
          </div>
        )}

        {error && (
          <div className="flex min-h-0 flex-1 items-center justify-center p-4">
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          </div>
        )}

        {!loading && !error && service && (
          <div className="flex min-h-0 flex-1">

            {/* ---- Column 1: Service Info ---- */}
            <div className="h-full w-full min-h-0 basis-[22%] shrink-0 p-1">
              <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
                {/* Header chrome */}
                <div className="grid min-h-10 grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-border bg-card px-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/app/marketplace/services')}
                    className="h-6 w-6 shrink-0"
                    title="Back to Services"
                  >
                    <HugeiconsIcon
                      icon={ArrowLeft02Icon}
                      size={16}
                      strokeWidth={2}
                      className="text-muted-foreground"
                    />
                  </Button>
                  <span className="truncate text-sm font-semibold text-foreground">
                    {service.service_name}
                  </span>
                  <Pill variant="primary" className="shrink-0 font-mono text-[10px] uppercase tracking-wide">
                    {service.service_type_label}
                  </Pill>
                </div>
                {/* Scrollable content */}
                <ScrollArea className="min-h-0 flex-1" viewportClass="h-full overflow-y-auto overflow-x-hidden" contentClass="min-w-0 p-3">
                  <div className="space-y-3">
                    <div className="flex items-center gap-1 text-xs">
                      <SectionLabel>Base URL</SectionLabel>
                      <code className="truncate rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-foreground/80">
                        {service.base_url}
                      </code>
                      <CopyButton value={service.base_url} label="Copy base URL" />
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <SectionLabel>Health</SectionLabel>
                      <code className="truncate rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-foreground/80">
                        {service.health_status}
                      </code>
                    </div>

                    {service.description && (
                      <p className="text-xs leading-relaxed text-muted-foreground">{service.description}</p>
                    )}

                    {isNonEmptyObject(service.config) && (
                      <div className="rounded-md border border-border/50">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setServiceConfigOpen((v) => !v)}
                          className="h-auto w-full justify-between px-2 py-1.5"
                        >
                          <SectionLabel>{`Config (${Object.keys(service.config!).length} keys)`}</SectionLabel>
                          <IconChevronRight
                            size={12}
                            className={`text-muted-foreground transition-transform ${serviceConfigOpen ? 'rotate-90' : ''}`}
                          />
                        </Button>
                        {serviceConfigOpen && (
                          <div className="px-2 pb-2">
                            <JsonBlock value={service.config} label="Config" defaultExpanded={0} showLabel={false} />
                          </div>
                        )}
                      </div>
                    )}

                    {isNonEmptyObject(service.auth_config) && (
                      <div className="rounded-md border border-border/50">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setServiceAuthConfigOpen((v) => !v)}
                          className="h-auto w-full justify-between px-2 py-1.5"
                        >
                          <SectionLabel>Auth Config</SectionLabel>
                          <IconChevronRight
                            size={12}
                            className={`text-muted-foreground transition-transform ${serviceAuthConfigOpen ? 'rotate-90' : ''}`}
                          />
                        </Button>
                        {serviceAuthConfigOpen && (
                          <div className="px-2 pb-2">
                            <JsonBlock value={service.auth_config} label="Auth Config" defaultExpanded={0} showLabel={false} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* ---- Column 2: Functions List ---- */}
            <div className="h-full w-full min-h-0 basis-[24%] shrink-0 p-1">
              <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
                {/* Header chrome */}
                <div className="grid min-h-10 grid-cols-[1fr_auto] items-center border-b border-border bg-card px-2">
                  <span className="truncate text-sm font-semibold text-foreground">
                    Functions
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {functions.length}
                  </span>
                </div>
                {/* Content */}
                {functions.length === 0 ? (
                  <div className="flex min-h-0 flex-1 items-center justify-center p-3">
                    <p className="text-xs text-muted-foreground">No functions registered.</p>
                  </div>
                ) : (
                  <ScrollArea className="min-h-0 flex-1" viewportClass="h-full overflow-y-auto overflow-x-hidden" contentClass="min-w-0 p-3">
                    <div className="mb-3 space-y-2">
                      <input
                        type="search"
                        aria-label="Search Functions"
                        value={functionQuery}
                        onChange={(event) => setFunctionQuery(event.currentTarget.value)}
                        placeholder="Search functions"
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
                      />
                      <select
                        aria-label="Filter Functions by Type"
                        value={selectedFunctionType}
                        onChange={(event) => setSelectedFunctionType(event.currentTarget.value)}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
                      >
                        <option value="all">{`All types (${functions.length})`}</option>
                        {functionTypeOptions.map(([type, count]) => (
                          <option key={type} value={type}>
                            {`${type} (${count})`}
                          </option>
                        ))}
                      </select>
                    </div>
                    {filteredFunctions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No functions match the current filters.</p>
                    ) : (
                      <div className="space-y-1">
                        {filteredFunctions.map((fn) => {
                          const active = fn.function_id === selectedFunctionId;
                          return (
                            <Button
                              key={fn.function_id}
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedFunctionId(fn.function_id)}
                              className={`h-auto w-full flex-col items-start justify-start gap-0.5 whitespace-normal rounded-md border px-2.5 py-2 text-left font-normal transition-colors ${
                                active
                                  ? 'border-primary/40 bg-primary/10'
                                  : 'border-border/40 hover:bg-accent/50'
                              }`}
                            >
                              <p className="w-full font-mono text-xs font-semibold leading-snug text-foreground break-words [overflow-wrap:anywhere]">
                                {fn.function_name}
                              </p>
                              {fn.label && fn.label !== fn.function_name && (
                                <p className="w-full text-[10px] leading-snug text-muted-foreground break-words [overflow-wrap:anywhere]">
                                  {fn.label}
                                </p>
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                )}
              </div>
            </div>

            {/* ---- Column 3: Function Detail ---- */}
            <div className="h-full w-full min-h-0 min-w-0 flex-1 p-1">
              <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
                {selectedFn ? (
                  <>
                    <div className="shrink-0">
                      <FunctionReferenceHeader fn={selectedFn} baseUrl={baseUrl} />
                    </div>
                    <ScrollArea className="min-h-0 flex-1" viewportClass="h-full overflow-y-auto overflow-x-hidden p-4">
                      <FunctionReferenceBody fn={selectedFn} />
                    </ScrollArea>
                  </>
                ) : functions.length > 0 ? (
                  <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
                    No functions match the current filters.
                  </div>
                ) : (
                  <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
                    Select a function from the left menu.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
