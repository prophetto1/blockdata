import { useCallback, useEffect, useMemo, useState } from 'react';
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
  saveFunction,
  subscribeToServiceChanges,
  toggleFunctionEnabled,
} from './services-panel.api';
import { ServicesSidebar } from './ServicesSidebar';
import { ServiceDetailRailView } from './ServiceDetailRailView';
import { functionToDraft } from './services-panel.types';

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
      const msg = result.error ?? '';
      if (!msg.toLowerCase().includes('failed to fetch')) {
        setError(result.error);
      } else {
        setError(null);
      }
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

  const handleToggleFunctionEnabled = (fn: ServiceFunctionRow) => {
    void withMutation(
      `function:${fn.function_id}`,
      () => toggleFunctionEnabled(fn.function_id, !fn.enabled),
      `${fn.function_name} ${fn.enabled ? 'disabled' : 'enabled'}.`,
    );
  };

  const handleSaveFunctionJson = (fn: ServiceFunctionRow, json: Record<string, unknown>) => {
    const draft = functionToDraft({ ...fn, ...json } as ServiceFunctionRow);
    void withMutation(
      `function:${fn.function_id}`,
      () => saveFunction(fn.function_id, draft),
      `${fn.function_name} saved.`,
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

      <div className="mb-2 flex items-center px-1">
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
          <ServiceDetailRailView
            service={selectedService}
            functions={functionsForSelected}
            savingKey={savingKey}
            notice={null}
            onToggleFunctionEnabled={handleToggleFunctionEnabled}
            onSaveFunctionJson={handleSaveFunctionJson}
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
