import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { edgeFetch } from '@/lib/edge';
import { cn } from '@/lib/utils';
import { SettingCard, type SectionDef, type PolicyRow } from './setting-card-shared';

/* ------------------------------------------------------------------ */
/*  Instance config key prefixes (filter from full policy list)        */
/* ------------------------------------------------------------------ */

const INSTANCE_PREFIXES = [
  'jobs.', 'workers.', 'registries.',
  'alerts.', 'observability.', 'secret_storage.',
];

function isInstanceKey(key: string): boolean {
  return INSTANCE_PREFIXES.some((p) => key.startsWith(p));
}

/* ------------------------------------------------------------------ */
/*  Static section definitions (end-user onboarding reference)         */
/* ------------------------------------------------------------------ */

const SECTIONS: SectionDef[] = [
  {
    id: 'jobs',
    label: 'Jobs',
    settings: [
      {
        key: 'jobs.default_timeout',
        label: 'Default task timeout (seconds)',
        description: 'Timeout applied to individual task runs unless overridden.',
        fieldType: 'number',
        defaultValue: 300,
        placeholder: '300',
      },
      {
        key: 'jobs.max_execution_timeout',
        label: 'Max execution timeout (seconds)',
        description: 'Hard ceiling on total execution duration including all tasks.',
        fieldType: 'number',
        defaultValue: 900,
        placeholder: '900',
      },
      {
        key: 'jobs.isolation_mode',
        label: 'Isolation mode',
        description: 'How task scripts are sandboxed during execution.',
        fieldType: 'select',
        defaultValue: 'subprocess',
        selectItems: ['none', 'subprocess', 'container'],
      },
      {
        key: 'jobs.keep_job_dirs',
        label: 'Keep job directories for debug',
        description: 'Retain temporary task directories after execution completes.',
        fieldType: 'boolean',
        defaultValue: false,
      },
      {
        key: 'jobs.retention_period_days',
        label: 'Retention period (days)',
        description: 'How long to keep execution history and logs in the database.',
        fieldType: 'number',
        defaultValue: 30,
        placeholder: '30',
      },
    ],
  },
  {
    id: 'workers',
    label: 'Workers',
    settings: [
      {
        key: 'workers.concurrency',
        label: 'Concurrency limit',
        description: 'Maximum number of tasks a single worker can execute in parallel.',
        fieldType: 'number',
        defaultValue: 3,
        placeholder: '3',
      },
      {
        key: 'workers.group',
        label: 'Worker group',
        description: 'Worker group assignment for task routing.',
        fieldType: 'select',
        defaultValue: 'default',
        selectItems: ['default', 'native', 'heavy'],
      },
      {
        key: 'workers.auto_register_plugins',
        label: 'Auto-register plugins on startup',
        description: 'Automatically sync plugin registry from worker /plugins endpoint on boot.',
        fieldType: 'boolean',
        defaultValue: true,
      },
    ],
  },
  {
    id: 'registries',
    label: 'Registries',
    settings: [
      {
        key: 'registries.pip_index_url',
        label: 'Pip index URL',
        description: 'Private PyPI registry URL for Python dependency resolution.',
        fieldType: 'password',
        defaultValue: '',
        placeholder: 'https://username:password@pypi.company.com/simple',
      },
      {
        key: 'registries.npmrc',
        label: 'NPM registry (.npmrc)',
        description: 'Full .npmrc content for private npm registries. Used by TypeScript/Node tasks.',
        fieldType: 'textarea',
        defaultValue: '',
        placeholder: 'registry=https://registry.mycompany.com/\n//registry.mycompany.com/:_authToken=TOKEN',
      },
    ],
  },
  {
    id: 'alerts',
    label: 'Alerts',
    settings: [
      {
        key: 'alerts.slack_webhook_url',
        label: 'Slack webhook URL',
        description: 'Incoming webhook URL for critical alert delivery to Slack.',
        fieldType: 'password',
        defaultValue: '',
        placeholder: 'https://hooks.slack.com/services/...',
      },
      {
        key: 'alerts.smtp_host',
        label: 'Email SMTP host',
        description: 'SMTP server for sending email alerts and notifications.',
        fieldType: 'text',
        defaultValue: '',
        placeholder: 'smtp.gmail.com',
      },
      {
        key: 'alerts.on_execution_failure',
        label: 'Alert on execution failure',
        description: 'Send an alert whenever a pipeline execution transitions to FAILED.',
        fieldType: 'boolean',
        defaultValue: true,
      },
    ],
  },
  {
    id: 'observability',
    label: 'Observability',
    settings: [
      {
        key: 'observability.otel_endpoint',
        label: 'OpenTelemetry endpoint',
        description: 'OTEL collector URL for distributed tracing of task executions.',
        fieldType: 'text',
        defaultValue: '',
        placeholder: 'http://localhost:4318',
      },
      {
        key: 'observability.prometheus_enabled',
        label: 'Prometheus metrics enabled',
        description: 'Expose /metrics endpoint for Prometheus scraping.',
        fieldType: 'boolean',
        defaultValue: false,
      },
      {
        key: 'observability.log_retention_days',
        label: 'Log retention (days)',
        description: 'How long to retain execution logs before automatic cleanup.',
        fieldType: 'number',
        defaultValue: 7,
        placeholder: '7',
      },
    ],
  },
  {
    id: 'secret-storage',
    label: 'Secret Storage',
    settings: [
      {
        key: 'secret_storage.backend',
        label: 'Backend',
        description: 'Where secrets and credentials are stored. Supabase Vault encrypts at rest in the database.',
        fieldType: 'select',
        defaultValue: 'supabase-vault',
        selectItems: ['supabase-vault', 'env'],
      },
    ],
  },
];

/** All instance config keys from SECTIONS */
const ALL_INSTANCE_KEYS = new Set(SECTIONS.flatMap((s) => s.settings.map((st) => st.key)));

/* ------------------------------------------------------------------ */
/*  Main panel                                                         */
/* ------------------------------------------------------------------ */

export function InstanceConfigPanel() {
  const { hash } = useLocation();
  const activeSection = useMemo(() => {
    const id = hash.replace('#', '');
    return SECTIONS.find((s) => s.id === id) ?? SECTIONS[0]!;
  }, [hash]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Server values (last loaded from DB)
  const [serverValues, setServerValues] = useState<Record<string, unknown>>({});
  // Local draft values (what the user sees / edits)
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
    for (const key of ALL_INSTANCE_KEYS) {
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
      const instancePolicies = policies.filter((p) => isInstanceKey(p.policy_key));

      const loaded: Record<string, unknown> = {};
      // Start from defaults
      for (const section of SECTIONS) {
        for (const setting of section.settings) {
          loaded[setting.key] = setting.defaultValue;
        }
      }
      // Overlay DB values
      for (const row of instancePolicies) {
        if (ALL_INSTANCE_KEYS.has(row.policy_key)) {
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
          reason: 'Instance config update',
        }),
      });
      const text = await resp.text();
      let payload: { ok?: boolean; error?: string } = {};
      try { payload = text ? JSON.parse(text) : {}; } catch { /* fallback */ }
      if (!resp.ok) throw new Error(payload.error ?? text ?? `HTTP ${resp.status}`);

      // Sync server value
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
        reason: 'Instance config bulk update',
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
    <div className="h-full overflow-y-auto px-6">
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

      {dirtyKeys.size > 0 && (
        <div className="mb-4 flex justify-end">
          <Button
            size="sm"
            className="text-xs"
            disabled={savingKey === '__all__'}
            onClick={() => void handleSaveAll()}
          >
            {savingKey === '__all__' ? 'Saving...' : `Save all (${dirtyKeys.size})`}
          </Button>
        </div>
      )}

      <div className="pb-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">{activeSection.label}</h2>
          <p className="text-xs text-muted-foreground">
            {activeSection.settings.length} setting{activeSection.settings.length !== 1 ? 's' : ''}
            {loading && ' — loading...'}
          </p>
        </div>
        <div className="space-y-3">
          {activeSection.settings.map((setting) => (
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