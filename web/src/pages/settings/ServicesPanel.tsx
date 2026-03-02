import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { styleTokens } from '@/lib/styleTokens';
import type {
  InlineStatus,
  ServiceFunctionRow,
  ServiceRow,
  ServiceTypeRow,
} from './services-panel.types';
import {
  loadAllServices,
  loadPublicServices,
  subscribeToServiceChanges,
  toggleFunctionEnabled,
  toggleServiceEnabled,
} from './services-panel.api';
import { ServicesSidebar } from './ServicesSidebar';
import { ServiceDetailPanel } from './ServiceDetailPanel';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

type ServicesPanelProps = {
  /** 'admin' = full CRUD (default), 'browse' = read-only for end users */
  mode?: 'admin' | 'browse';
};

/* ------------------------------------------------------------------ */
/*  Orchestrator                                                       */
/* ------------------------------------------------------------------ */

export function ServicesPanel({ mode = 'admin' }: ServicesPanelProps) {
  const isAdmin = mode === 'admin';
  /* ---- Core state ---- */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<InlineStatus | null>(null);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [functions, setFunctions] = useState<ServiceFunctionRow[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  /* ---- Derived ---- */
  const selectedService = useMemo(
    () => services.find((s) => s.service_id === selectedServiceId) ?? null,
    [services, selectedServiceId],
  );

  const functionsForSelected = useMemo(
    () =>
      selectedServiceId
        ? functions.filter((f) => f.service_id === selectedServiceId)
        : [],
    [functions, selectedServiceId],
  );

  /* ---- Data loading ---- */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = isAdmin
      ? await loadAllServices()
      : await loadPublicServices();
    if (result.ok) {
      setServiceTypes(result.data.service_types);
      setServices(result.data.services);
      setFunctions(result.data.functions);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /* ---- Real-time subscription ---- */
  useEffect(() => {
    const sub = subscribeToServiceChanges(() => void loadData());
    return () => sub.unsubscribe();
  }, [loadData]);

  /* ---- Handle selected service disappearing ---- */
  useEffect(() => {
    if (
      selectedServiceId &&
      !services.some((s) => s.service_id === selectedServiceId)
    ) {
      setSelectedServiceId(null);
    }
  }, [services, selectedServiceId]);

  /* ---- Toggle wrappers (only writes allowed) ---- */
  const withMutation = async (
    key: string,
    action: () => Promise<{ ok: boolean; error?: string; payload?: unknown }>,
    successMessage: string,
  ) => {
    setStatus(null);
    setSavingKey(key);
    const result = await action();
    if (result.ok) {
      await loadData();
      setStatus({ kind: 'success', message: successMessage });
    } else {
      setStatus({ kind: 'error', message: result.error ?? 'Unknown error' });
    }
    setSavingKey(null);
  };

  const handleToggleServiceEnabled = (service: ServiceRow) => {
    void withMutation(
      `service:${service.service_id}`,
      () => toggleServiceEnabled(service.service_id, !service.enabled),
      `${service.service_name} ${service.enabled ? 'disabled' : 'enabled'}.`,
    );
  };

  const handleToggleFunctionEnabled = (fn: ServiceFunctionRow) => {
    void withMutation(
      `function:${fn.function_id}`,
      () => toggleFunctionEnabled(fn.function_id, !fn.enabled),
      `${fn.function_name} ${fn.enabled ? 'disabled' : 'enabled'}.`,
    );
  };

  /* ---- Render ---- */
  return (
    <div className="flex h-full flex-col">
      {/* Status banner */}
      {status && (
        <div
          className="mb-2 rounded-md border px-3 py-2 text-sm"
          style={
            status.kind === 'success'
              ? {
                  borderColor: styleTokens.adminConfig.status.success.border,
                  backgroundColor:
                    styleTokens.adminConfig.status.success.background,
                  color: styleTokens.adminConfig.status.success.foreground,
                }
              : {
                  borderColor: styleTokens.adminConfig.status.error.border,
                  backgroundColor:
                    styleTokens.adminConfig.status.error.background,
                  color: styleTokens.adminConfig.status.error.foreground,
                }
          }
          role="status"
          aria-live="polite"
        >
          {status.message}
        </div>
      )}

      {error && (
        <div className="mb-2">
          <ErrorAlert message={error} />
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-2 flex items-center gap-2 px-1">
        <Button
          size="sm"
          className="h-7 px-3 text-xs"
          disabled={loading}
          onClick={() => void loadData()}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {services.length} services, {functions.length} functions
        </span>
      </div>

      {/* Main: sidebar + detail */}
      <div className="flex min-h-0 flex-1 gap-0 overflow-hidden">
        <ServicesSidebar
          services={services}
          functions={functions}
          serviceTypes={serviceTypes}
          selectedServiceId={selectedServiceId}
          onSelectService={setSelectedServiceId}
          loading={loading}
        />

        {selectedService ? (
          <ServiceDetailPanel
            service={selectedService}
            functions={functionsForSelected}
            savingKey={savingKey}
            onToggleServiceEnabled={handleToggleServiceEnabled}
            onToggleFunctionEnabled={handleToggleFunctionEnabled}
            onClose={() => setSelectedServiceId(null)}
            isAdmin={isAdmin}
          />
        ) : (
          <div className="flex min-w-0 flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a service to view details.
          </div>
        )}
      </div>
    </div>
  );
}
