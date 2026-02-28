import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { edgeFetch } from '@/lib/edge';
import { supabase } from '@/lib/supabase';

type CatalogServiceRow = {
  service_id: string;
  service_type: string;
  service_name: string;
  base_url: string;
  enabled: boolean;
};

type CatalogFunctionRow = {
  function_id: string;
  service_id: string;
  function_name: string;
  function_type: string;
  label: string;
  entrypoint: string;
  enabled: boolean;
};

type CatalogItemRow = {
  item_id: string;
  source: string;
  external_id: string;
  plugin_name: string;
  plugin_title: string | null;
  plugin_group: string | null;
  plugin_version: string | null;
  categories: string[] | null;
  task_class: string;
  task_title: string | null;
  task_description: string | null;
  task_schema: Record<string, unknown> | null;
  task_markdown: string | null;
  enabled: boolean;
  suggested_service_type: string | null;
  mapped_service_id: string | null;
  mapped_function_id: string | null;
  mapping_notes: string | null;
  source_updated_at: string | null;
  last_synced_at: string;
  updated_at: string;
};

type AdminIntegrationCatalogResponse = {
  superuser: { user_id: string; email: string };
  items: CatalogItemRow[];
  services: CatalogServiceRow[];
  functions: CatalogFunctionRow[];
};

type SyncSummary = {
  total_normalized: number;
  would_insert?: number;
  would_update?: number;
  inserted?: number;
  updated?: number;
  duplicate_classes_in_payload: number;
};

type SyncResponse = {
  ok: boolean;
  dry_run: boolean;
  source_url: string;
  summary: SyncSummary;
  warnings?: string[];
};

type ItemDraft = {
  enabled: boolean;
  suggested_service_type: string;
  mapped_service_id: string;
  mapped_function_id: string;
  mapping_notes: string;
};

type InlineStatus = {
  kind: 'success' | 'error';
  message: string;
};

function toDraft(row: CatalogItemRow): ItemDraft {
  return {
    enabled: row.enabled,
    suggested_service_type: row.suggested_service_type ?? '',
    mapped_service_id: row.mapped_service_id ?? '',
    mapped_function_id: row.mapped_function_id ?? '',
    mapping_notes: row.mapping_notes ?? '',
  };
}

function formatTimestamp(value: string | null): string {
  if (!value) return 'n/a';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

function countSchemaKeys(schema: Record<string, unknown> | null): number {
  if (!schema || typeof schema !== 'object') return 0;
  return Object.keys(schema).length;
}

export function IntegrationCatalogPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<InlineStatus | null>(null);
  const [items, setItems] = useState<CatalogItemRow[]>([]);
  const [services, setServices] = useState<CatalogServiceRow[]>([]);
  const [functions, setFunctions] = useState<CatalogFunctionRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ItemDraft>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState('http://localhost:8080/api/v1/plugins');
  const [search, setSearch] = useState('');
  const [lastSync, setLastSync] = useState<SyncResponse | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const resp = await edgeFetch('admin-integration-catalog', { method: 'GET' });
      const text = await resp.text();
      let payload: AdminIntegrationCatalogResponse | { error?: string } = {};
      try {
        payload = text ? (JSON.parse(text) as AdminIntegrationCatalogResponse) : payload;
      } catch {
        // Fall back to text below.
      }
      if (!resp.ok) throw new Error((payload as { error?: string }).error ?? text ?? `HTTP ${resp.status}`);

      const data = payload as AdminIntegrationCatalogResponse;
      const nextItems = Array.isArray(data.items) ? data.items : [];
      const nextServices = Array.isArray(data.services) ? data.services : [];
      const nextFunctions = Array.isArray(data.functions) ? data.functions : [];

      setItems(nextItems);
      setServices(nextServices);
      setFunctions(nextFunctions);
      setDrafts(
        nextItems.reduce<Record<string, ItemDraft>>((acc, row) => {
          acc[row.item_id] = toDraft(row);
          return acc;
        }, {}),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-integration-catalog-items')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'integration_catalog_items' },
        () => {
          void loadCatalog();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadCatalog]);

  const runSync = async (dryRun: boolean) => {
    setStatus(null);
    const key = dryRun ? 'sync:dry-run' : 'sync:apply';
    setSavingKey(key);
    try {
      const resp = await edgeFetch('admin-integration-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'sync_kestra',
          source_url: sourceUrl.trim() || undefined,
          dry_run: dryRun,
        }),
      });
      const text = await resp.text();
      let payload: SyncResponse | { error?: string } = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        // Keep textual fallback below.
      }
      if (!resp.ok) throw new Error((payload as { error?: string }).error ?? text ?? `HTTP ${resp.status}`);

      const data = payload as SyncResponse;
      setLastSync(data);
      if (!dryRun) {
        await loadCatalog();
      }

      const warnCount = data.warnings?.length ?? 0;
      setStatus({
        kind: 'success',
        message: dryRun
          ? `Dry run: ${data.summary.total_normalized} items (${data.summary.would_insert ?? 0} insert, ${data.summary.would_update ?? 0} update, ${warnCount} warnings).`
          : `Sync applied: ${data.summary.total_normalized} items (${data.summary.inserted ?? 0} inserted, ${data.summary.updated ?? 0} updated, ${warnCount} warnings).`,
      });
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSavingKey(null);
    }
  };

  const saveItem = async (itemId: string) => {
    const draft = drafts[itemId];
    if (!draft) return;
    setStatus(null);
    const key = `item:save:${itemId}`;
    setSavingKey(key);
    try {
      const resp = await edgeFetch('admin-integration-catalog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'item',
          item_id: itemId,
          enabled: draft.enabled,
          suggested_service_type: draft.suggested_service_type.trim() || null,
          mapped_service_id: draft.mapped_service_id.trim() || null,
          mapped_function_id: draft.mapped_function_id.trim() || null,
          mapping_notes: draft.mapping_notes.trim() || null,
        }),
      });
      const text = await resp.text();
      let payload: { error?: string } = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        // Keep text fallback below.
      }
      if (!resp.ok) throw new Error(payload.error ?? text ?? `HTTP ${resp.status}`);
      await loadCatalog();
      setStatus({ kind: 'success', message: 'Catalog item updated.' });
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSavingKey(null);
    }
  };

  const hydrateDetail = async (taskClass: string) => {
    setStatus(null);
    const key = `item:hydrate:${taskClass}`;
    setSavingKey(key);
    try {
      const resp = await edgeFetch('admin-integration-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'hydrate_detail',
          task_class: taskClass,
        }),
      });
      const text = await resp.text();
      let payload: { error?: string } = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        // Keep text fallback below.
      }
      if (!resp.ok) throw new Error(payload.error ?? text ?? `HTTP ${resp.status}`);
      await loadCatalog();
      setStatus({ kind: 'success', message: 'Task detail hydrated from source.' });
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSavingKey(null);
    }
  };

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) => {
      const haystack = [
        row.task_class,
        row.task_title ?? '',
        row.plugin_name,
        row.plugin_group ?? '',
        row.plugin_version ?? '',
        row.suggested_service_type ?? '',
      ].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [items, search]);

  const functionMapByService = useMemo(() => {
    const map = new Map<string, CatalogFunctionRow[]>();
    for (const fn of functions) {
      const existing = map.get(fn.service_id) ?? [];
      existing.push(fn);
      map.set(fn.service_id, existing);
    }
    return map;
  }, [functions]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted-foreground">
          Kestra Source URL
          <input
            className="mt-1 h-8 w-[460px] max-w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.currentTarget.value)}
            placeholder="http://localhost:8080/api/v1/plugins"
          />
        </label>
        <Button size="sm" className="h-8 px-3 text-xs" disabled={loading} onClick={() => void loadCatalog()}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
        <Button
          size="sm"
          className="h-8 px-3 text-xs"
          disabled={savingKey === 'sync:dry-run'}
          onClick={() => void runSync(true)}
        >
          {savingKey === 'sync:dry-run' ? 'Running...' : 'Dry-Run Sync'}
        </Button>
        <Button
          size="sm"
          className="h-8 px-3 text-xs"
          disabled={savingKey === 'sync:apply'}
          onClick={() => void runSync(false)}
        >
          {savingKey === 'sync:apply' ? 'Applying...' : 'Apply Sync'}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-muted-foreground">
          Items: <span className="font-mono">{items.length}</span> | Filtered: <span className="font-mono">{filteredItems.length}</span> |
          Services: <span className="font-mono">{services.length}</span> | Functions: <span className="font-mono">{functions.length}</span>
        </p>
        <input
          className="h-8 min-w-[240px] rounded-md border border-input bg-background px-2 text-xs text-foreground"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder="Search class, plugin, title..."
        />
      </div>

      {lastSync && (
        <p className="text-xs text-muted-foreground">
          Last sync result: <span className="font-mono">{lastSync.summary.total_normalized}</span> items,
          {' '}
          <span className="font-mono">{lastSync.summary.duplicate_classes_in_payload}</span> duplicate classes in payload.
        </p>
      )}

      {status && (
        <div className={status.kind === 'error' ? 'rounded-md border border-red-400/40 bg-red-500/10 p-2 text-xs text-red-200' : 'rounded-md border border-emerald-400/40 bg-emerald-500/10 p-2 text-xs text-emerald-100'}>
          {status.message}
        </div>
      )}
      {error && <ErrorAlert message={error} />}

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[1480px] border-collapse text-xs">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-2 py-2 font-medium">Task Class</th>
              <th className="px-2 py-2 font-medium">Plugin</th>
              <th className="px-2 py-2 font-medium">Category</th>
              <th className="px-2 py-2 font-medium">Suggested Type</th>
              <th className="px-2 py-2 font-medium">Mapped Service</th>
              <th className="px-2 py-2 font-medium">Mapped Function</th>
              <th className="px-2 py-2 font-medium">Enabled</th>
              <th className="px-2 py-2 font-medium">Notes</th>
              <th className="px-2 py-2 font-medium">Schema</th>
              <th className="px-2 py-2 font-medium">Updated</th>
              <th className="px-2 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((row) => {
              const draft = drafts[row.item_id] ?? toDraft(row);
              const rowSaveKey = `item:save:${row.item_id}`;
              const rowHydrateKey = `item:hydrate:${row.task_class}`;
              const serviceFunctions = draft.mapped_service_id
                ? (functionMapByService.get(draft.mapped_service_id) ?? [])
                : functions;
              return (
                <tr key={row.item_id} className="border-t border-border align-top">
                  <td className="px-2 py-2">
                    <p className="font-mono text-[11px] text-foreground">{row.task_class}</p>
                    <p className="mt-1 text-muted-foreground">{row.task_title ?? row.task_class}</p>
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">
                    <p className="font-mono">{row.plugin_name}</p>
                    <p>{row.plugin_version ?? 'n/a'}</p>
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">{(row.categories ?? []).join(', ') || 'n/a'}</td>
                  <td className="px-2 py-2">
                    <input
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"
                      value={draft.suggested_service_type}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [row.item_id]: { ...draft, suggested_service_type: event.currentTarget.value },
                        }))}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"
                      value={draft.mapped_service_id}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [row.item_id]: { ...draft, mapped_service_id: event.currentTarget.value, mapped_function_id: '' },
                        }))}
                    >
                      <option value="">(unmapped)</option>
                      {services.map((service) => (
                        <option key={service.service_id} value={service.service_id}>
                          {service.service_type}/{service.service_name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <select
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"
                      value={draft.mapped_function_id}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [row.item_id]: { ...draft, mapped_function_id: event.currentTarget.value },
                        }))}
                    >
                      <option value="">(unmapped)</option>
                      {serviceFunctions.map((fn) => (
                        <option key={fn.function_id} value={fn.function_id}>
                          {fn.function_name} ({fn.function_type})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <label className="inline-flex items-center gap-2 text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={draft.enabled}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [row.item_id]: { ...draft, enabled: event.currentTarget.checked },
                          }))}
                      />
                      {draft.enabled ? 'on' : 'off'}
                    </label>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"
                      value={draft.mapping_notes}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [row.item_id]: { ...draft, mapping_notes: event.currentTarget.value },
                        }))}
                      placeholder="optional note"
                    />
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">
                    <p>{countSchemaKeys(row.task_schema)} keys</p>
                    <p className="text-[11px]">Synced {formatTimestamp(row.last_synced_at)}</p>
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">
                    <p>{formatTimestamp(row.updated_at)}</p>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={savingKey === rowSaveKey}
                        onClick={() => void saveItem(row.item_id)}
                      >
                        {savingKey === rowSaveKey ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={savingKey === rowHydrateKey}
                        onClick={() => void hydrateDetail(row.task_class)}
                      >
                        {savingKey === rowHydrateKey ? 'Fetching...' : 'Fetch Schema'}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && !error && filteredItems.length === 0 && (
              <tr>
                <td className="px-2 py-3 text-muted-foreground" colSpan={11}>
                  No catalog items match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

