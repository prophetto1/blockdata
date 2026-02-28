import Editor from '@monaco-editor/react';
import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog';
import { styleTokens } from '@/lib/styleTokens';
import { edgeFetch } from '@/lib/edge';
import { supabase } from '@/lib/supabase';

type ServiceRow = {
  service_id: string;
  service_type: string;
  service_name: string;
  base_url: string;
  health_status: string;
  last_heartbeat: string | null;
  enabled: boolean;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type ParamDef = {
  name: string;
  type: string;
  required?: boolean;
  default?: unknown;
  description?: string;
  values?: string[];
};

type ServiceFunctionRow = {
  function_id: string;
  service_id: string;
  function_name: string;
  function_type: string;
  label: string;
  description: string | null;
  entrypoint: string;
  http_method: string;
  parameter_schema: ParamDef[];
  result_schema: Record<string, unknown> | null;
  enabled: boolean;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
};

type ServiceTypeRow = {
  service_type: string;
  label: string;
  description: string | null;
};

type AdminServicesResponse = {
  superuser: { user_id: string; email: string };
  service_types: ServiceTypeRow[];
  services: ServiceRow[];
  functions: ServiceFunctionRow[];
};

type ServiceDraft = {
  service_type: string;
  service_name: string;
  base_url: string;
  health_status: string;
  enabled: boolean;
  configText: string;
};

type FunctionDraft = {
  function_name: string;
  function_type: string;
  label: string;
  description: string;
  entrypoint: string;
  http_method: string;
  tagsText: string;
  enabled: boolean;
};

type InlineStatus = {
  kind: 'success' | 'error';
  message: string;
};

function formatTimestamp(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

function parseJsonTextarea(input: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(input) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Invalid JSON',
    };
  }
}

function stringifyValue(value: unknown): string {
  const serialized = JSON.stringify(value, null, 2);
  return serialized ?? 'null';
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseTagsText(input: string): string[] {
  return input
    .split(',')
    .map((value) => value.trim())
    .filter((value, index, all) => value.length > 0 && all.indexOf(value) === index);
}

function serviceToDraft(row: ServiceRow): ServiceDraft {
  return {
    service_type: row.service_type,
    service_name: row.service_name,
    base_url: row.base_url,
    health_status: row.health_status,
    enabled: row.enabled,
    configText: stringifyValue(row.config ?? {}),
  };
}

function functionToDraft(row: ServiceFunctionRow): FunctionDraft {
  return {
    function_name: row.function_name,
    function_type: row.function_type,
    label: row.label,
    description: row.description ?? '',
    entrypoint: row.entrypoint,
    http_method: row.http_method,
    tagsText: (row.tags ?? []).join(', '),
    enabled: row.enabled,
  };
}

function emptyFunctionDraft(): FunctionDraft {
  return {
    function_name: '',
    function_type: 'utility',
    label: '',
    description: '',
    entrypoint: '',
    http_method: 'POST',
    tagsText: '',
    enabled: true,
  };
}

const inputClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

const FUNCTION_TYPE_OPTIONS = ['source', 'destination', 'transform', 'parse', 'convert', 'export', 'test', 'utility', 'macro', 'custom', 'ingest', 'callback'] as const;
const HTTP_METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'DELETE'] as const;

function subscribeTheme(cb: () => void) {
  const observer = new MutationObserver(cb);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

function getMonacoTheme(): string {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'vs-dark';
}

function useMonacoTheme(): string {
  return useSyncExternalStore(subscribeTheme, getMonacoTheme, () => 'vs-dark');
}

export function ServicesPanel() {
  const monacoTheme = useMonacoTheme();
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRow[]>([]);
  const [serviceRows, setServiceRows] = useState<ServiceRow[]>([]);
  const [serviceFunctions, setServiceFunctions] = useState<ServiceFunctionRow[]>([]);
  const [serviceSavingKey, setServiceSavingKey] = useState<string | null>(null);
  const [serviceDrafts, setServiceDrafts] = useState<Record<string, ServiceDraft>>({});
  const [functionDrafts, setFunctionDrafts] = useState<Record<string, FunctionDraft>>({});
  const [newServiceDraft, setNewServiceDraft] = useState<ServiceDraft>({
    service_type: 'custom',
    service_name: '',
    base_url: '',
    health_status: 'unknown',
    enabled: true,
    configText: '{}',
  });
  const [newFunctionDraftsByService, setNewFunctionDraftsByService] = useState<Record<string, FunctionDraft>>({});
  const [configDialogServiceId, setConfigDialogServiceId] = useState<string | null>(null);
  const serviceImportInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<InlineStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState<string | null>(null);
  const [expandedParams, setExpandedParams] = useState<Set<string>>(new Set());

  const loadServices = useCallback(async () => {
    setServiceLoading(true);
    setServiceError(null);

    try {
      const resp = await edgeFetch('admin-services', { method: 'GET' });
      const text = await resp.text();
      let payload: AdminServicesResponse | { error?: string } = {};
      try {
        payload = text ? (JSON.parse(text) as AdminServicesResponse) : payload;
      } catch {
        // Keep raw fallback below.
      }

      if (!resp.ok) {
        const errPayload = payload as { error?: string };
        throw new Error(errPayload.error ?? text ?? `HTTP ${resp.status}`);
      }

      const data = payload as AdminServicesResponse;
      const nextServiceTypes = Array.isArray(data.service_types) ? data.service_types : [];
      const nextServices = Array.isArray(data.services) ? data.services : [];
      const nextFunctions = Array.isArray(data.functions) ? data.functions : [];

      setServiceTypes(nextServiceTypes);
      setServiceRows(nextServices);
      setServiceFunctions(nextFunctions);
      setServiceDrafts(
        nextServices.reduce<Record<string, ServiceDraft>>((acc, row) => {
          acc[row.service_id] = serviceToDraft(row);
          return acc;
        }, {}),
      );
      setFunctionDrafts(
        nextFunctions.reduce<Record<string, FunctionDraft>>((acc, row) => {
          acc[row.function_id] = functionToDraft(row);
          return acc;
        }, {}),
      );
      setNewFunctionDraftsByService(
        nextServices.reduce<Record<string, FunctionDraft>>((acc, row) => {
          acc[row.service_id] = emptyFunctionDraft();
          return acc;
        }, {}),
      );
      setNewServiceDraft((prev) => ({
        ...prev,
        service_type: prev.service_type === 'custom' && nextServiceTypes.length > 0
          ? nextServiceTypes[0].service_type
          : prev.service_type,
      }));
    } catch (e) {
      setServiceError(e instanceof Error ? e.message : String(e));
    } finally {
      setServiceLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-services-registry')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_registry' },
        () => {
          void loadServices();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_functions' },
        () => {
          void loadServices();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadServices]);

  const serviceFunctionsByService = useMemo(() => {
    const map = new Map<string, ServiceFunctionRow[]>();
    for (const fn of serviceFunctions) {
      if (!map.has(fn.service_id)) map.set(fn.service_id, []);
      map.get(fn.service_id)?.push(fn);
    }
    for (const [serviceId, rows] of map.entries()) {
      rows.sort((a, b) => a.function_name.localeCompare(b.function_name));
      map.set(serviceId, rows);
    }
    return map;
  }, [serviceFunctions]);

  const filteredServiceRows = useMemo(() => {
    let rows = serviceRows;
    if (activeTypeFilter) {
      rows = rows.filter((s) => s.service_type === activeTypeFilter);
    }
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.trim().toLowerCase();
    const matchingServiceIds = new Set<string>();
    for (const s of rows) {
      if (
        s.service_name.toLowerCase().includes(q) ||
        s.service_type.toLowerCase().includes(q) ||
        s.base_url.toLowerCase().includes(q)
      ) {
        matchingServiceIds.add(s.service_id);
      }
    }
    for (const fn of serviceFunctions) {
      if (
        fn.function_name.toLowerCase().includes(q) ||
        fn.label.toLowerCase().includes(q) ||
        (fn.description ?? '').toLowerCase().includes(q) ||
        fn.function_type.toLowerCase().includes(q) ||
        (fn.tags ?? []).some((t) => t.toLowerCase().includes(q))
      ) {
        matchingServiceIds.add(fn.service_id);
      }
    }
    return rows.filter((s) => matchingServiceIds.has(s.service_id));
  }, [serviceRows, serviceFunctions, searchQuery, activeTypeFilter]);

  const distinctServiceTypes = useMemo(() => {
    const seen = new Set<string>();
    for (const s of serviceRows) seen.add(s.service_type);
    return Array.from(seen).sort();
  }, [serviceRows]);

  const activeConfigServiceDraft = useMemo(() => {
    if (!configDialogServiceId) return null;
    return serviceDrafts[configDialogServiceId] ?? null;
  }, [configDialogServiceId, serviceDrafts]);

  const activeConfigServiceName = useMemo(() => {
    if (!configDialogServiceId) return 'Service';
    return serviceRows.find((row) => row.service_id === configDialogServiceId)?.service_name ?? 'Service';
  }, [configDialogServiceId, serviceRows]);

  useEffect(() => {
    if (!configDialogServiceId) return;
    if (!serviceDrafts[configDialogServiceId]) {
      setConfigDialogServiceId(null);
    }
  }, [configDialogServiceId, serviceDrafts]);

  const toggleServiceEnabled = async (row: ServiceRow) => {
    setStatus(null);
    const nextEnabled = !row.enabled;
    const key = `service:${row.service_id}`;
    setServiceSavingKey(key);
    try {
      const resp = await edgeFetch('admin-services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'service',
          service_id: row.service_id,
          enabled: nextEnabled,
        }),
      });
      const text = await resp.text();
      let payload: { error?: string } = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        // Keep raw fallback below.
      }
      if (!resp.ok) {
        throw new Error(payload.error ?? text ?? `HTTP ${resp.status}`);
      }

      await loadServices();
      setStatus({
        kind: 'success',
        message: `${row.service_name} ${nextEnabled ? 'enabled' : 'disabled'}.`,
      });
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setServiceSavingKey(null);
    }
  };

  const toggleFunctionEnabled = async (row: ServiceFunctionRow) => {
    setStatus(null);
    const nextEnabled = !row.enabled;
    const key = `function:${row.function_id}`;
    setServiceSavingKey(key);
    try {
      const resp = await edgeFetch('admin-services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'function',
          function_id: row.function_id,
          enabled: nextEnabled,
        }),
      });
      const text = await resp.text();
      let payload: { error?: string } = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        // Keep raw fallback below.
      }
      if (!resp.ok) {
        throw new Error(payload.error ?? text ?? `HTTP ${resp.status}`);
      }

      await loadServices();
      setStatus({
        kind: 'success',
        message: `${row.function_name} ${nextEnabled ? 'enabled' : 'disabled'}.`,
      });
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setServiceSavingKey(null);
    }
  };

  const importRegistryJson = async (rawText: string) => {
    setStatus(null);
    const parsed = parseJsonTextarea(rawText);
    if (!parsed.ok) {
      setStatus({
        kind: 'error',
        message: `Invalid JSON file: ${parsed.error}`,
      });
      return;
    }

    let payload: Record<string, unknown> = {};
    if (Array.isArray(parsed.value)) {
      payload = { plugins: parsed.value };
    } else if (isPlainRecord(parsed.value)) {
      payload = parsed.value;
    } else {
      setStatus({
        kind: 'error',
        message: 'Import JSON must be an object or an array of plugins.',
      });
      return;
    }

    const key = 'service:import';
    setServiceSavingKey(key);
    try {
      const resp = await edgeFetch('admin-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'import_registry',
          import_mode: 'upsert',
          ...payload,
        }),
      });
      const text = await resp.text();
      let responsePayload: { error?: string; imported?: { services?: number; functions?: number }; warnings?: string[] } = {};
      try {
        responsePayload = text ? JSON.parse(text) : {};
      } catch {
        // raw fallback
      }
      if (!resp.ok) {
        throw new Error(responsePayload.error ?? text ?? `HTTP ${resp.status}`);
      }

      await loadServices();
      const importedServices = responsePayload.imported?.services ?? 0;
      const importedFunctions = responsePayload.imported?.functions ?? 0;
      const warningCount = Array.isArray(responsePayload.warnings) ? responsePayload.warnings.length : 0;
      setStatus({
        kind: 'success',
        message: warningCount > 0
          ? `Imported ${importedServices} services and ${importedFunctions} functions (${warningCount} warnings).`
          : `Imported ${importedServices} services and ${importedFunctions} functions.`,
      });
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setServiceSavingKey(null);
    }
  };

  const createService = async () => {
    setStatus(null);
    const parsedConfig = parseJsonTextarea(newServiceDraft.configText);
    if (!parsedConfig.ok || typeof parsedConfig.value !== 'object' || parsedConfig.value === null || Array.isArray(parsedConfig.value)) {
      setStatus({
        kind: 'error',
        message: `Service config JSON must be an object${parsedConfig.ok ? '' : `: ${parsedConfig.error}`}.`,
      });
      return;
    }

    if (!newServiceDraft.service_type.trim() || !newServiceDraft.service_name.trim() || !newServiceDraft.base_url.trim()) {
      setStatus({
        kind: 'error',
        message: 'Service type, service name, and base URL are required.',
      });
      return;
    }

    const key = 'service:create';
    setServiceSavingKey(key);
    try {
      const resp = await edgeFetch('admin-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'service',
          service_type: newServiceDraft.service_type.trim(),
          service_name: newServiceDraft.service_name.trim(),
          base_url: newServiceDraft.base_url.trim(),
          health_status: newServiceDraft.health_status,
          enabled: newServiceDraft.enabled,
          config: parsedConfig.value,
        }),
      });
      const text = await resp.text();
      let payload: { error?: string } = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        // raw fallback
      }
      if (!resp.ok) throw new Error(payload.error ?? text ?? `HTTP ${resp.status}`);

      await loadServices();
      setNewServiceDraft((prev) => ({
        ...prev,
        service_name: '',
        base_url: '',
        configText: '{}',
      }));
      setStatus({ kind: 'success', message: 'Service created.' });
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setServiceSavingKey(null);
    }
  };

  const saveServiceDetails = async (serviceId: string) => {
    setStatus(null);
    const draft = serviceDrafts[serviceId];
    if (!draft) return;

    const parsedConfig = parseJsonTextarea(draft.configText);
    if (!parsedConfig.ok || typeof parsedConfig.value !== 'object' || parsedConfig.value === null || Array.isArray(parsedConfig.value)) {
      setStatus({
        kind: 'error',
        message: `Service config JSON must be an object${parsedConfig.ok ? '' : `: ${parsedConfig.error}`}.`,
      });
      return;
    }
    if (!draft.base_url.trim() || !draft.service_name.trim() || !draft.service_type.trim()) {
      setStatus({
        kind: 'error',
        message: 'Service type, service name, and base URL are required.',
      });
      return;
    }

    const key = `service:save:${serviceId}`;
    setServiceSavingKey(key);
    try {
      const resp = await edgeFetch('admin-services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'service',
          service_id: serviceId,
          service_type: draft.service_type.trim(),
          service_name: draft.service_name.trim(),
          base_url: draft.base_url.trim(),
          health_status: draft.health_status,
          enabled: draft.enabled,
          config: parsedConfig.value,
        }),
      });
      const text = await resp.text();
      let payload: { error?: string } = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        // raw fallback
      }
      if (!resp.ok) throw new Error(payload.error ?? text ?? `HTTP ${resp.status}`);

      await loadServices();
      setStatus({ kind: 'success', message: 'Service updated.' });
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setServiceSavingKey(null);
    }
  };

  const deleteService = async (serviceId: string, serviceName: string) => {
    setStatus(null);
    const key = `service:delete:${serviceId}`;
    setServiceSavingKey(key);
    try {
      const resp = await edgeFetch('admin-services', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'service',
          service_id: serviceId,
        }),
      });
      const text = await resp.text();
      let payload: { error?: string } = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        // raw fallback
      }
      if (!resp.ok) throw new Error(payload.error ?? text ?? `HTTP ${resp.status}`);

      await loadServices();
      setStatus({ kind: 'success', message: `${serviceName} deleted.` });
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setServiceSavingKey(null);
    }
  };

  const createFunction = async (serviceId: string) => {
    setStatus(null);
    const draft = newFunctionDraftsByService[serviceId] ?? emptyFunctionDraft();
    if (!draft.function_name.trim() || !draft.label.trim() || !draft.entrypoint.trim()) {
      setStatus({
        kind: 'error',
        message: 'Function name, label, and entrypoint are required.',
      });
      return;
    }

    const key = `function:create:${serviceId}`;
    setServiceSavingKey(key);
    try {
      const resp = await edgeFetch('admin-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'function',
          service_id: serviceId,
          function_name: draft.function_name.trim(),
          function_type: draft.function_type,
          label: draft.label.trim(),
          description: draft.description.trim() ? draft.description.trim() : null,
          entrypoint: draft.entrypoint.trim(),
          http_method: draft.http_method,
          enabled: draft.enabled,
          tags: parseTagsText(draft.tagsText),
        }),
      });
      const text = await resp.text();
      let payload: { error?: string } = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        // raw fallback
      }
      if (!resp.ok) throw new Error(payload.error ?? text ?? `HTTP ${resp.status}`);

      await loadServices();
      setNewFunctionDraftsByService((prev) => ({
        ...prev,
        [serviceId]: emptyFunctionDraft(),
      }));
      setStatus({ kind: 'success', message: 'Function created.' });
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setServiceSavingKey(null);
    }
  };

  const saveFunctionDetails = async (functionId: string) => {
    setStatus(null);
    const draft = functionDrafts[functionId];
    if (!draft) return;
    if (!draft.function_name.trim() || !draft.label.trim() || !draft.entrypoint.trim()) {
      setStatus({
        kind: 'error',
        message: 'Function name, label, and entrypoint are required.',
      });
      return;
    }

    const key = `function:save:${functionId}`;
    setServiceSavingKey(key);
    try {
      const resp = await edgeFetch('admin-services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'function',
          function_id: functionId,
          function_name: draft.function_name.trim(),
          function_type: draft.function_type,
          label: draft.label.trim(),
          description: draft.description.trim() ? draft.description.trim() : null,
          entrypoint: draft.entrypoint.trim(),
          http_method: draft.http_method,
          enabled: draft.enabled,
          tags: parseTagsText(draft.tagsText),
        }),
      });
      const text = await resp.text();
      let payload: { error?: string } = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        // raw fallback
      }
      if (!resp.ok) throw new Error(payload.error ?? text ?? `HTTP ${resp.status}`);

      await loadServices();
      setStatus({ kind: 'success', message: 'Function updated.' });
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setServiceSavingKey(null);
    }
  };

  const deleteFunction = async (functionId: string, functionName: string) => {
    setStatus(null);
    const key = `function:delete:${functionId}`;
    setServiceSavingKey(key);
    try {
      const resp = await edgeFetch('admin-services', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'function',
          function_id: functionId,
        }),
      });
      const text = await resp.text();
      let payload: { error?: string } = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        // raw fallback
      }
      if (!resp.ok) throw new Error(payload.error ?? text ?? `HTTP ${resp.status}`);

      await loadServices();
      setStatus({ kind: 'success', message: `${functionName} deleted.` });
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setServiceSavingKey(null);
    }
  };

  return (
    <div className="space-y-3">
      {status && (
        <div
          className="rounded-md border px-3 py-2 text-sm"
          style={status.kind === 'success'
            ? {
                borderColor: styleTokens.adminConfig.status.success.border,
                backgroundColor: styleTokens.adminConfig.status.success.background,
                color: styleTokens.adminConfig.status.success.foreground,
              }
            : {
                borderColor: styleTokens.adminConfig.status.error.border,
                backgroundColor: styleTokens.adminConfig.status.error.background,
                color: styleTokens.adminConfig.status.error.foreground,
              }}
          role="status"
          aria-live="polite"
        >
          {status.message}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="h-8 px-3 text-xs"
          disabled={serviceLoading}
          onClick={() => void loadServices()}
        >
          {serviceLoading ? 'Refreshing...' : 'Refresh Services'}
        </Button>
        <Button
          size="sm"
          className="h-8 px-3 text-xs"
          disabled={serviceSavingKey === 'service:import'}
          onClick={() => serviceImportInputRef.current?.click()}
        >
          {serviceSavingKey === 'service:import' ? 'Importing...' : 'Import JSON'}
        </Button>
        <input
          ref={serviceImportInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (!file) return;
            void file.text().then((text) => importRegistryJson(text));
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Services: <span className="font-mono">{serviceRows.length}</span> | Functions: <span className="font-mono">{serviceFunctions.length}</span>
      </p>
      <p className="text-xs text-muted-foreground">
        Import accepts object payloads with <span className="font-mono">services/functions</span> or Kestra-style <span className="font-mono">plugins</span> with <span className="font-mono">type</span>.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${inputClass} max-w-xs`}
          placeholder="Search services, functions, tags..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.currentTarget.value)}
        />
        <button
          type="button"
          className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
            activeTypeFilter === null
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-muted text-muted-foreground hover:bg-accent'
          }`}
          onClick={() => setActiveTypeFilter(null)}
        >
          All
        </button>
        {distinctServiceTypes.map((st) => (
          <button
            key={st}
            type="button"
            className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
              activeTypeFilter === st
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-muted text-muted-foreground hover:bg-accent'
            }`}
            onClick={() => setActiveTypeFilter(activeTypeFilter === st ? null : st)}
          >
            {st}
          </button>
        ))}
      </div>

      <article className="rounded-lg border border-border bg-background/60 p-4">
        <h3 className="text-sm font-semibold text-foreground">Add Service</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <label className="text-xs text-muted-foreground">
            Type
            <select
              className={`${inputClass} mt-1`}
              value={newServiceDraft.service_type}
              onChange={(event) => setNewServiceDraft((prev) => ({ ...prev, service_type: event.currentTarget.value }))}
            >
              {serviceTypes.map((row) => (
                <option key={row.service_type} value={row.service_type}>{row.service_type}</option>
              ))}
              {!serviceTypes.some((row) => row.service_type === newServiceDraft.service_type) && (
                <option value={newServiceDraft.service_type}>{newServiceDraft.service_type}</option>
              )}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">
            Name
            <input
              className={`${inputClass} mt-1`}
              value={newServiceDraft.service_name}
              onChange={(event) => setNewServiceDraft((prev) => ({ ...prev, service_name: event.currentTarget.value }))}
              placeholder="conversion-service"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Base URL
            <input
              className={`${inputClass} mt-1`}
              value={newServiceDraft.base_url}
              onChange={(event) => setNewServiceDraft((prev) => ({ ...prev, base_url: event.currentTarget.value }))}
              placeholder="https://service.example.com"
            />
          </label>
          <div className="text-xs text-muted-foreground md:col-span-3">
            Config (JSON object)
            <div className="mt-1 overflow-hidden rounded-md border border-input">
              <Editor
                height="140px"
                language="json"
                theme={monacoTheme}
                value={newServiceDraft.configText}
                onChange={(value) => setNewServiceDraft((prev) => ({ ...prev, configText: value ?? '{}' }))}
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  fontSize: 12,
                  lineNumbers: 'on',
                  automaticLayout: true,
                }}
              />
            </div>
          </div>
        </div>
        <div className="mt-3">
          <Button
            size="sm"
            className="h-8 px-3 text-xs"
            disabled={serviceSavingKey === 'service:create'}
            onClick={() => void createService()}
          >
            {serviceSavingKey === 'service:create' ? 'Creating...' : 'Create Service'}
          </Button>
        </div>
      </article>

      {serviceLoading && (
        <p className="text-sm text-muted-foreground">Loading services...</p>
      )}
      {serviceError && (
        <ErrorAlert message={serviceError} />
      )}
      {!serviceLoading && !serviceError && serviceRows.length === 0 && (
        <p className="text-sm text-muted-foreground">No registered services found.</p>
      )}
      {!serviceLoading && !serviceError && serviceRows.length > 0 && filteredServiceRows.length === 0 && (
        <p className="text-sm text-muted-foreground">No services match the current filter.</p>
      )}

      {!serviceLoading && !serviceError && filteredServiceRows.map((service) => {
        const functionRows = serviceFunctionsByService.get(service.service_id) ?? [];
        const serviceButtonKey = `service:${service.service_id}`;
        const serviceSaveKey = `service:save:${service.service_id}`;
        const serviceDeleteKey = `service:delete:${service.service_id}`;
        const serviceDraft = serviceDrafts[service.service_id] ?? serviceToDraft(service);
        const newFunctionDraft = newFunctionDraftsByService[service.service_id] ?? emptyFunctionDraft();
        return (
          <article key={service.service_id} className="rounded-lg bg-transparent p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{service.service_name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="font-mono">{service.service_type}</span> | <span className="font-mono">{service.base_url}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {service.health_status}
                </span>
                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {service.enabled ? 'enabled' : 'disabled'}
                </span>
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs"
                  disabled={serviceSavingKey === serviceButtonKey}
                  onClick={() => void toggleServiceEnabled(service)}
                >
                  {serviceSavingKey === serviceButtonKey
                    ? 'Saving...'
                    : service.enabled
                      ? 'Disable'
                      : 'Enable'}
                </Button>
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs"
                  disabled={serviceSavingKey === serviceSaveKey}
                  onClick={() => void saveServiceDetails(service.service_id)}
                >
                  {serviceSavingKey === serviceSaveKey ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={() => setConfigDialogServiceId(service.service_id)}
                >
                  Config
                </Button>
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs"
                  disabled={serviceSavingKey === serviceDeleteKey}
                  onClick={() => void deleteService(service.service_id, service.service_name)}
                >
                  {serviceSavingKey === serviceDeleteKey ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Updated {formatTimestamp(service.updated_at)}
            </p>

            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <label className="text-xs text-muted-foreground">
                Type
                <select
                  className={`${inputClass} mt-1`}
                  value={serviceDraft.service_type}
                  onChange={(event) => setServiceDrafts((prev) => ({
                    ...prev,
                    [service.service_id]: { ...serviceDraft, service_type: event.currentTarget.value },
                  }))}
                >
                  {serviceTypes.map((row) => (
                    <option key={row.service_type} value={row.service_type}>{row.service_type}</option>
                  ))}
                  {!serviceTypes.some((row) => row.service_type === serviceDraft.service_type) && (
                    <option value={serviceDraft.service_type}>{serviceDraft.service_type}</option>
                  )}
                </select>
              </label>
              <label className="text-xs text-muted-foreground">
                Name
                <input
                  className={`${inputClass} mt-1`}
                  value={serviceDraft.service_name}
                  onChange={(event) => setServiceDrafts((prev) => ({
                    ...prev,
                    [service.service_id]: { ...serviceDraft, service_name: event.currentTarget.value },
                  }))}
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Base URL
                <input
                  className={`${inputClass} mt-1`}
                  value={serviceDraft.base_url}
                  onChange={(event) => setServiceDrafts((prev) => ({
                    ...prev,
                    [service.service_id]: { ...serviceDraft, base_url: event.currentTarget.value },
                  }))}
                />
              </label>
            </div>

            <div className="mt-3 overflow-auto rounded-md border border-border">
              <table className="min-w-full border-collapse text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Function</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Label</th>
                    <th className="px-3 py-2 font-medium">Method</th>
                    <th className="px-3 py-2 font-medium">Entrypoint</th>
                    <th className="px-3 py-2 font-medium">Tags</th>
                    <th className="px-3 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {functionRows.map((fn) => {
                    const functionButtonKey = `function:${fn.function_id}`;
                    const functionSaveKey = `function:save:${fn.function_id}`;
                    const functionDeleteKey = `function:delete:${fn.function_id}`;
                    const functionDraft = functionDrafts[fn.function_id] ?? functionToDraft(fn);
                    const params = fn.parameter_schema ?? [];
                    const isExpanded = expandedParams.has(fn.function_id);
                    const PARAM_COLLAPSE_THRESHOLD = 5;
                    const visibleParams = isExpanded || params.length <= PARAM_COLLAPSE_THRESHOLD
                      ? params
                      : params.slice(0, PARAM_COLLAPSE_THRESHOLD);
                    return (
                      <React.Fragment key={fn.function_id}>
                      <tr className="border-t border-border align-top">
                        <td className="px-3 py-2 text-foreground">
                          <input
                            className={`${inputClass} h-8`}
                            value={functionDraft.function_name}
                            onChange={(event) => setFunctionDrafts((prev) => ({
                              ...prev,
                              [fn.function_id]: { ...functionDraft, function_name: event.currentTarget.value },
                            }))}
                          />
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          <select
                            className={`${inputClass} h-8`}
                            value={functionDraft.function_type}
                            onChange={(event) => setFunctionDrafts((prev) => ({
                              ...prev,
                              [fn.function_id]: { ...functionDraft, function_type: event.currentTarget.value },
                            }))}
                          >
                            {FUNCTION_TYPE_OPTIONS.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          <input
                            className={`${inputClass} h-8`}
                            value={functionDraft.label}
                            onChange={(event) => setFunctionDrafts((prev) => ({
                              ...prev,
                              [fn.function_id]: { ...functionDraft, label: event.currentTarget.value },
                            }))}
                          />
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          <select
                            className={`${inputClass} h-8`}
                            value={functionDraft.http_method}
                            onChange={(event) => setFunctionDrafts((prev) => ({
                              ...prev,
                              [fn.function_id]: { ...functionDraft, http_method: event.currentTarget.value },
                            }))}
                          >
                            {HTTP_METHOD_OPTIONS.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 font-mono text-muted-foreground">
                          <input
                            className={`${inputClass} h-8`}
                            value={functionDraft.entrypoint}
                            onChange={(event) => setFunctionDrafts((prev) => ({
                              ...prev,
                              [fn.function_id]: { ...functionDraft, entrypoint: event.currentTarget.value },
                            }))}
                          />
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          <input
                            className={`${inputClass} h-8`}
                            value={functionDraft.tagsText}
                            onChange={(event) => setFunctionDrafts((prev) => ({
                              ...prev,
                              [fn.function_id]: { ...functionDraft, tagsText: event.currentTarget.value },
                            }))}
                            placeholder="tags,comma,separated"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs"
                              disabled={serviceSavingKey === functionButtonKey}
                              onClick={() => void toggleFunctionEnabled(fn)}
                            >
                              {serviceSavingKey === functionButtonKey
                                ? 'Saving...'
                                : fn.enabled
                                  ? 'Disable'
                                  : 'Enable'}
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs"
                              disabled={serviceSavingKey === functionSaveKey}
                              onClick={() => void saveFunctionDetails(fn.function_id)}
                            >
                              {serviceSavingKey === functionSaveKey ? 'Saving...' : 'Save'}
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs"
                              disabled={serviceSavingKey === functionDeleteKey}
                              onClick={() => void deleteFunction(fn.function_id, fn.function_name)}
                            >
                              {serviceSavingKey === functionDeleteKey ? 'Deleting...' : 'Delete'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {params.length > 0 && (
                        <tr className="bg-muted/30">
                          <td colSpan={7} className="px-3 py-1.5">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span className="font-medium text-foreground/70">Params:</span>
                              {visibleParams.map((p) => (
                                <span key={p.name} className="inline-flex items-center gap-1">
                                  <span className="font-mono">{p.name}</span>
                                  <span className="text-muted-foreground/60">({p.type})</span>
                                  {p.required && <span className="rounded bg-primary/10 px-1 text-[10px] font-medium text-primary">req</span>}
                                  {p.default !== undefined && <span className="text-muted-foreground/50">={String(p.default)}</span>}
                                  {p.values && <span className="text-muted-foreground/50">[{p.values.join('|')}]</span>}
                                </span>
                              ))}
                              {params.length > PARAM_COLLAPSE_THRESHOLD && (
                                <button
                                  type="button"
                                  className="text-primary hover:underline"
                                  onClick={() => setExpandedParams((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(fn.function_id)) next.delete(fn.function_id);
                                    else next.add(fn.function_id);
                                    return next;
                                  })}
                                >
                                  {isExpanded ? 'show less' : `+${params.length - PARAM_COLLAPSE_THRESHOLD} more`}
                                </button>
                              )}
                              {fn.result_schema && (
                                <span className="ml-auto text-muted-foreground/50">
                                  result: {Object.keys(fn.result_schema).length} keys
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    );
                  })}
                  <tr className="border-t border-border align-top">
                    <td className="px-3 py-2">
                      <input
                        className={`${inputClass} h-8`}
                        value={newFunctionDraft.function_name}
                        onChange={(event) => setNewFunctionDraftsByService((prev) => ({
                          ...prev,
                          [service.service_id]: { ...newFunctionDraft, function_name: event.currentTarget.value },
                        }))}
                        placeholder="new_function_key"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className={`${inputClass} h-8`}
                        value={newFunctionDraft.function_type}
                        onChange={(event) => setNewFunctionDraftsByService((prev) => ({
                          ...prev,
                          [service.service_id]: { ...newFunctionDraft, function_type: event.currentTarget.value },
                        }))}
                      >
                        {FUNCTION_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className={`${inputClass} h-8`}
                        value={newFunctionDraft.label}
                        onChange={(event) => setNewFunctionDraftsByService((prev) => ({
                          ...prev,
                          [service.service_id]: { ...newFunctionDraft, label: event.currentTarget.value },
                        }))}
                        placeholder="Display label"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className={`${inputClass} h-8`}
                        value={newFunctionDraft.http_method}
                        onChange={(event) => setNewFunctionDraftsByService((prev) => ({
                          ...prev,
                          [service.service_id]: { ...newFunctionDraft, http_method: event.currentTarget.value },
                        }))}
                      >
                        {HTTP_METHOD_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className={`${inputClass} h-8`}
                        value={newFunctionDraft.entrypoint}
                        onChange={(event) => setNewFunctionDraftsByService((prev) => ({
                          ...prev,
                          [service.service_id]: { ...newFunctionDraft, entrypoint: event.currentTarget.value },
                        }))}
                        placeholder="/functions/v1/example"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className={`${inputClass} h-8`}
                        value={newFunctionDraft.tagsText}
                        onChange={(event) => setNewFunctionDraftsByService((prev) => ({
                          ...prev,
                          [service.service_id]: { ...newFunctionDraft, tagsText: event.currentTarget.value },
                        }))}
                        placeholder="tags,comma,separated"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={serviceSavingKey === `function:create:${service.service_id}`}
                        onClick={() => void createFunction(service.service_id)}
                      >
                        {serviceSavingKey === `function:create:${service.service_id}` ? 'Creating...' : 'Add'}
                      </Button>
                    </td>
                  </tr>
                  {functionRows.length === 0 && (
                    <tr className="border-t border-border">
                      <td className="px-3 py-2 text-muted-foreground" colSpan={7}>
                        No functions registered for this service.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        );
      })}

      <DialogRoot
        open={!!configDialogServiceId}
        onOpenChange={(details) => {
          if (!details.open) setConfigDialogServiceId(null);
        }}
      >
        <DialogContent className="w-[960px] max-w-[calc(100vw-2rem)]">
          <DialogCloseTrigger />
          <DialogTitle>{`Service Config: ${activeConfigServiceName}`}</DialogTitle>
          <DialogDescription>Edit service-level JSON config.</DialogDescription>
          <DialogBody>
            <div className="overflow-hidden rounded-md border border-input">
              <Editor
                height="320px"
                language="json"
                theme={monacoTheme}
                value={activeConfigServiceDraft?.configText ?? '{}'}
                onChange={(value) => {
                  if (!configDialogServiceId) return;
                  setServiceDrafts((prev) => {
                    const current = prev[configDialogServiceId];
                    if (!current) return prev;
                    return {
                      ...prev,
                      [configDialogServiceId]: {
                        ...current,
                        configText: value ?? '{}',
                      },
                    };
                  });
                }}
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  fontSize: 12,
                  lineNumbers: 'on',
                  automaticLayout: true,
                }}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => setConfigDialogServiceId(null)}
            >
              Close
            </Button>
            <Button
              size="sm"
              className="h-8 px-3 text-xs"
              disabled={!configDialogServiceId || serviceSavingKey === `service:save:${configDialogServiceId}`}
              onClick={() => {
                if (!configDialogServiceId) return;
                void saveServiceDetails(configDialogServiceId);
              }}
            >
              {configDialogServiceId && serviceSavingKey === `service:save:${configDialogServiceId}` ? 'Saving...' : 'Save Config'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </div>
  );
}
