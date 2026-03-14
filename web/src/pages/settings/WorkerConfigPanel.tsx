import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { edgeFetch } from '@/lib/edge';
import { cn } from '@/lib/utils';
import { SettingCard, type SectionDef, type PolicyRow } from './setting-card-shared';

/* ------------------------------------------------------------------ */
/*  Worker config sections (real blockdata extraction worker knobs)    */
/* ------------------------------------------------------------------ */

const SECTIONS: SectionDef[] = [
  {
    id: 'batching',
    label: 'Batching',
    settings: [
      {
        key: 'worker.batching.enabled',
        label: 'Adaptive batching enabled',
        description: 'Enable adaptive batching by default for new runs.',
        fieldType: 'boolean',
        defaultValue: true,
      },
      {
        key: 'worker.batching.pack_size',
        label: 'Pack size (default)',
        description: 'Default target blocks-per-pack for new runs.',
        fieldType: 'number',
        defaultValue: 10,
      },
      {
        key: 'worker.batching.pack_size_max',
        label: 'Pack size (max)',
        description: 'Hard cap for pack size on new runs.',
        fieldType: 'number',
        defaultValue: 40,
      },
      {
        key: 'worker.batching.text_heavy_max_pack_size',
        label: 'Text-heavy max pack size',
        description: 'Max pack size for text-heavy schemas on new runs.',
        fieldType: 'number',
        defaultValue: 6,
      },
      {
        key: 'worker.batching.context_window_tokens',
        label: 'Context window budget',
        description: 'Context window budget used for pack construction.',
        fieldType: 'number',
        defaultValue: 200000,
      },
      {
        key: 'worker.batching.output_reserve_tokens',
        label: 'Output reserve tokens',
        description: 'Reserved output budget used for pack construction.',
        fieldType: 'number',
        defaultValue: 20000,
      },
      {
        key: 'worker.batching.max_output_tokens',
        label: 'Max output tokens per call',
        description: 'Per-call max output tokens for batched calls.',
        fieldType: 'number',
        defaultValue: 8192,
      },
      {
        key: 'worker.batching.per_block_output_tokens',
        label: 'Per-block output tokens',
        description: 'Estimated per-block output tokens for batching.',
        fieldType: 'number',
        defaultValue: 200,
      },
      {
        key: 'worker.batching.tool_overhead_tokens',
        label: 'Tool overhead tokens',
        description: 'Tool/prompt overhead budget used for pack construction.',
        fieldType: 'number',
        defaultValue: 2000,
      },
    ],
  },
  {
    id: 'queue',
    label: 'Queue Claims',
    settings: [
      {
        key: 'worker.claim_batch_size.default',
        label: 'Default claim batch size',
        description: 'Default queue claim batch size per worker request.',
        fieldType: 'number',
        defaultValue: 25,
      },
      {
        key: 'worker.claim_batch_size.min',
        label: 'Min claim batch size',
        description: 'Minimum queue claim batch size.',
        fieldType: 'number',
        defaultValue: 1,
      },
      {
        key: 'worker.claim_batch_size.max',
        label: 'Max claim batch size',
        description: 'Maximum queue claim batch size.',
        fieldType: 'number',
        defaultValue: 100,
      },
    ],
  },
  {
    id: 'general',
    label: 'General',
    settings: [
      {
        key: 'worker.max_retries',
        label: 'Max retries',
        description: 'Max attempts before marking block overlay failed.',
        fieldType: 'number',
        defaultValue: 3,
      },
      {
        key: 'worker.prompt_caching.enabled',
        label: 'Prompt caching enabled',
        description: 'Enable prompt caching by default for new runs.',
        fieldType: 'boolean',
        defaultValue: true,
      },
    ],
  },
];

const ALL_KEYS = new Set(SECTIONS.flatMap((s) => s.settings.map((st) => st.key)));

/* ------------------------------------------------------------------ */
/*  Panel                                                              */
/* ------------------------------------------------------------------ */

export function WorkerConfigPanel() {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const [serverValues, setServerValues] = useState<Record<string, unknown>>({});
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const section of SECTIONS) {
      for (const setting of section.settings) {
        initial[setting.key] = setting.defaultValue;
      }
    }
    return initial;
  });

  const dirtyKeys = useMemo(() => {
    if (loading) return new Set<string>();

    const dirty = new Set<string>();
    for (const key of ALL_KEYS) {
      if (JSON.stringify(values[key]) !== JSON.stringify(serverValues[key])) {
        dirty.add(key);
      }
    }
    return dirty;
  }, [loading, values, serverValues]);

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
      for (const section of SECTIONS) {
        for (const setting of section.settings) {
          loaded[setting.key] = setting.defaultValue;
        }
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
          reason: 'Worker config update',
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
        reason: 'Worker config bulk update',
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

  const currentSection = SECTIONS.find((s) => s.id === activeSection) ?? SECTIONS[0];

  return (
    <div className="flex h-full gap-0 overflow-hidden">
      {/* Section sidebar */}
      <nav className="w-56 shrink-0 overflow-y-auto border-r border-border pr-2">
        <ul className="space-y-0.5 py-1">
          {SECTIONS.map((section) => {
            const sectionDirtyCount = section.settings.filter((s) => dirtyKeys.has(s.key)).length;
            return (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
                    section.id === activeSection
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                  )}
                >
                  <span>{section.label}</span>
                  {sectionDirtyCount > 0 && (
                    <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/20 px-1 text-[10px] font-semibold text-primary">
                      {sectionDirtyCount}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {dirtyKeys.size > 0 && (
          <div className="mt-4 px-1">
            <Button
              size="sm"
              className="w-full text-xs"
              disabled={savingKey === '__all__'}
              onClick={() => void handleSaveAll()}
            >
              {savingKey === '__all__' ? 'Saving...' : `Save all (${dirtyKeys.size})`}
            </Button>
          </div>
        )}
      </nav>

      {/* Settings content */}
      <div className="min-w-0 flex-1 overflow-y-auto pl-6">
        {status && (
          <div className={cn(
            'mb-3 rounded-md border p-2 text-xs',
            status.kind === 'error'
              ? 'border-red-400/40 bg-red-500/10 text-red-200'
              : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
          )}>
            {status.message}
          </div>
        )}

        {error && (
          <div className="mb-3 rounded-md border border-red-400/40 bg-red-500/10 p-2 text-xs text-red-200">
            {error}
          </div>
        )}

        <div className="mb-4">
          <h2 className="text-lg font-semibold">{currentSection.label}</h2>
          <p className="text-xs text-muted-foreground">
            {currentSection.settings.length} setting{currentSection.settings.length !== 1 ? 's' : ''}
            {loading && ' — loading...'}
          </p>
        </div>

        <div className="space-y-3 pb-6">
          {currentSection.settings.map((setting) => (
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
      </div>
    </div>
  );
}
