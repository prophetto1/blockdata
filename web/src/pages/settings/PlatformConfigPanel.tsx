import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { edgeFetch } from '@/lib/edge';
import { SettingCard, type SettingDef, type PolicyRow } from './setting-card-shared';

/* ------------------------------------------------------------------ */
/*  Platform settings (superuser admin — real service endpoints)       */
/* ------------------------------------------------------------------ */

const SETTINGS: SettingDef[] = [
  {
    key: 'platform.base_url',
    label: 'Supabase URL',
    description: 'Base URL for Supabase database and auth services used by the platform.',
    fieldType: 'text',
    defaultValue: 'https://dbdzzhshmigewyprahej.supabase.co',
    placeholder: 'https://your-project.supabase.co',
  },
  {
    key: 'platform.pipeline_worker_url',
    label: 'Pipeline Worker (FastAPI) URL',
    description: 'Base URL of the FastAPI backend used for execution and catalog APIs.',
    fieldType: 'text',
    defaultValue: 'http://192.168.0.168:8000',
    placeholder: 'http://host:port',
  },
  {
    key: 'platform.request_size_limit_mb',
    label: 'Request size limit (MB)',
    description: 'Maximum HTTP request body size allowed by the active API ingress.',
    fieldType: 'number',
    defaultValue: 50,
    placeholder: '50',
  },
];

const ALL_KEYS = new Set(SETTINGS.map((s) => s.key));

/* ------------------------------------------------------------------ */
/*  Panel                                                              */
/* ------------------------------------------------------------------ */

export function PlatformConfigPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const [serverValues, setServerValues] = useState<Record<string, unknown>>({});
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const setting of SETTINGS) {
      initial[setting.key] = setting.defaultValue;
    }
    return initial;
  });

  const dirtyKeys = useMemo(() => {
    const dirty = new Set<string>();
    for (const key of ALL_KEYS) {
      if (JSON.stringify(values[key]) !== JSON.stringify(serverValues[key])) {
        dirty.add(key);
      }
    }
    return dirty;
  }, [values, serverValues]);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await edgeFetch('admin-config', { method: 'GET' });
      const text = await resp.text();
      let payload: { policies?: PolicyRow[]; error?: string } = {};
      try { payload = text ? JSON.parse(text) : {}; } catch { /* fallback */ }
      if (!resp.ok) throw new Error(payload.error ?? text ?? `HTTP ${resp.status}`);

      const policies = Array.isArray(payload.policies) ? payload.policies : [];
      const loaded: Record<string, unknown> = {};
      for (const setting of SETTINGS) {
        loaded[setting.key] = setting.defaultValue;
      }
      for (const row of policies) {
        if (ALL_KEYS.has(row.policy_key)) {
          loaded[row.policy_key] = row.value;
        }
      }

      setServerValues({ ...loaded });
      setValues({ ...loaded });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadConfig(); }, [loadConfig]);

  const handleChange = (key: string, val: unknown) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async (key: string) => {
    setStatus(null);
    setSavingKey(key);
    try {
      const resp = await edgeFetch('admin-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_key: key,
          value: values[key],
          reason: 'Platform config update',
        }),
      });
      const text = await resp.text();
      let payload: { ok?: boolean; error?: string } = {};
      try { payload = text ? JSON.parse(text) : {}; } catch { /* fallback */ }
      if (!resp.ok) throw new Error(payload.error ?? text ?? `HTTP ${resp.status}`);

      setServerValues((prev) => ({ ...prev, [key]: values[key] }));
      setStatus({ kind: 'success', message: `Saved ${key}` });
    } catch (e) {
      setStatus({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setSavingKey(null);
    }
  };

  const handleSaveAll = async () => {
    if (dirtyKeys.size === 0) return;
    setStatus(null);
    setSavingKey('__all__');
    try {
      const updates = [...dirtyKeys].map((key) => ({
        policy_key: key,
        value: values[key],
        reason: 'Platform config bulk update',
      }));
      const resp = await edgeFetch('admin-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      const text = await resp.text();
      let payload: { ok?: boolean; error?: string } = {};
      try { payload = text ? JSON.parse(text) : {}; } catch { /* fallback */ }
      if (!resp.ok) throw new Error(payload.error ?? text ?? `HTTP ${resp.status}`);

      setServerValues({ ...values });
      setStatus({ kind: 'success', message: `Saved ${updates.length} setting${updates.length !== 1 ? 's' : ''}` });
    } catch (e) {
      setStatus({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-3">
      {status && (
        <div className={`rounded-md border p-2 text-xs ${
          status.kind === 'error'
            ? 'border-red-400/40 bg-red-500/10 text-red-200'
            : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
        }`}>
          {status.message}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-400/40 bg-red-500/10 p-2 text-xs text-red-200">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {SETTINGS.length} settings{loading && ' — loading...'}
        </p>
        {dirtyKeys.size > 0 && (
          <Button
            size="sm"
            className="h-7 px-3 text-xs"
            disabled={savingKey === '__all__'}
            onClick={() => void handleSaveAll()}
          >
            {savingKey === '__all__' ? 'Saving...' : `Save all (${dirtyKeys.size})`}
          </Button>
        )}
      </div>

      {SETTINGS.map((setting) => (
        <SettingCard
          key={setting.key}
          setting={setting}
          value={values[setting.key]}
          onChange={handleChange}
          dirty={dirtyKeys.has(setting.key)}
          saving={savingKey === setting.key}
          onSave={(k) => void handleSave(k)}
        />
      ))}
    </div>
  );
}
