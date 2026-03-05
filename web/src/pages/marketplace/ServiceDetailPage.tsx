import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!serviceId) return;

    async function load() {
      setLoading(true);
      setError(null);

      const [svcRes, fnRes] = await Promise.all([
        supabase
          .from('registry_services')
          .select('*')
          .eq('service_id', serviceId)
          .single(),
        supabase
          .from('registry_service_functions')
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
  const selectedFn = functions.find((fn) => fn.function_id === selectedFunctionId) ?? null;

  // Auto-select first function
  useEffect(() => {
    if (functions.length > 0 && !selectedFunctionId) {
      setSelectedFunctionId(functions[0]!.function_id);
    }
  }, [functions, selectedFunctionId]);

  useEffect(() => {
    setServiceConfigOpen(false);
    setServiceAuthConfigOpen(false);
  }, [serviceId]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={service?.service_name ?? 'Service Detail'} />

      {loading && (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Loading...
        </div>
      )}

      {error && (
        <div className="mx-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && service && (
        <div className="flex min-h-0 flex-1">
          {/* ---- Left sidebar (fixed height, internal scroll) ---- */}
          <aside className="flex w-[28rem] shrink-0 flex-col">
            {/* Service info card */}
            <div className="ml-3 mr-0 mt-3 shrink-0 rounded-xl border border-border bg-card overflow-hidden flex h-[20rem] flex-col">
              {/* Header */}
              <div className="space-y-2 p-3">
                <div className="flex items-center gap-2">
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
                      size={20}
                      strokeWidth={2}
                      className="text-muted-foreground"
                    />
                  </Button>
                  <h3 className="min-w-0 flex-1 truncate text-base font-semibold leading-tight text-foreground">
                    {service.service_name}
                  </h3>
                  <Pill variant="primary" className="shrink-0 font-mono text-[10px] uppercase tracking-wide">
                    {service.service_type_label}
                  </Pill>
                </div>

                {/* Service metadata */}
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
              </div>

              {/* Scrollable content: description + config trees */}
              <ScrollArea className="min-h-0 flex-1" viewportClass="px-3 pb-3 space-y-3">
                {service.description && (
                  <p className="mb-3 text-xs leading-relaxed text-muted-foreground">{service.description}</p>
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
                  <div className="mt-1 rounded-md border border-border/50">
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
              </ScrollArea>
            </div>

            {/* Functions card — fills remaining height */}
            <div className="ml-3 mr-0 mt-2 mb-3 flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-card overflow-hidden p-3">
              <p className="mb-2 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Functions ({functions.length})
              </p>
              {functions.length === 0 ? (
                <p className="rounded-md border border-border/50 px-2 py-2 text-xs text-muted-foreground">
                  No functions registered.
                </p>
              ) : (
                <ScrollArea className="min-h-0 flex-1" viewportClass="pr-1 space-y-1">
                  {functions.map((fn) => {
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
                </ScrollArea>
              )}
            </div>
          </aside>

          {/* ---- Right content (single container: function detail card) ---- */}
          <div className="my-3 ml-3 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card max-w-[50%]">
            {selectedFn ? (
              <>
                <div className="shrink-0">
                  <FunctionReferenceHeader fn={selectedFn} baseUrl={baseUrl} />
                </div>
                <ScrollArea className="min-h-0 flex-1" viewportClass="pl-0 pr-4 pt-0 pb-4">
                  <FunctionReferenceBody fn={selectedFn} />
                </ScrollArea>
              </>
            ) : (
              <div className="flex min-h-0 flex-1 items-center px-4 py-6 text-sm text-muted-foreground">
                Select a function from the left menu.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
