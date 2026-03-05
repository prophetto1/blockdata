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
  saveFunctionRaw,
  subscribeToServiceChanges,
} from './services-panel.api';
import { ServicesSidebar } from './ServicesSidebar';
import { ServiceDetailRailView } from './ServiceDetailRailView';

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
  const [selectedFnId, setSelectedFnId] = useState<string | null>(null);

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

  /* Auto-select first function when service changes */
  useEffect(() => {
    if (functionsForSelected.length > 0) {
      if (!functionsForSelected.some((f) => f.function_id === selectedFnId)) {
        setSelectedFnId(functionsForSelected[0].function_id);
      }
    } else {
      setSelectedFnId(null);
    }
  }, [functionsForSelected, selectedFnId]);

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

  /* ---- Auto-select first service, handle selected disappearing ---- */
  useEffect(() => {
    if (
      selectedServiceId &&
      !services.some((s) => s.service_id === selectedServiceId)
    ) {
      setSelectedServiceId(services[0]?.service_id ?? null);
    } else if (!selectedServiceId && services.length > 0) {
      setSelectedServiceId(services[0].service_id);
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

  const handleSaveFunctionJson = (fn: ServiceFunctionRow, json: Record<string, unknown>) => {
    void withMutation(
      `function:${fn.function_id}`,
      () => saveFunctionRaw(fn.function_id, json),
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


      {/* Main layout: sidebar + detail */}
      <div
        className="flex min-h-0 flex-1 overflow-hidden rounded-md border border-border"
        style={{ backgroundColor: styleTokens.adminConfig.contentBackground }}
      >
        <ServicesSidebar
          services={services}
          functions={functions}
          serviceTypes={serviceTypes}
          selectedServiceId={selectedServiceId}
          onSelectService={setSelectedServiceId}
          selectedFunctionId={selectedFnId}
          onSelectFunction={setSelectedFnId}
          loading={loading}
        />

        {selectedService ? (
          <ServiceDetailRailView
            service={selectedService}
            functions={functionsForSelected}
            selectedFunctionId={selectedFnId}
            onSelectFunction={setSelectedFnId}
            savingKey={savingKey}
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
