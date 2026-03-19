import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { edgeFetch } from '@/lib/edge';
import { SettingCard, type PolicyRow, type SettingDef } from '@/pages/settings/setting-card-shared';
import {
  DEFAULT_DOCUMENT_VIEW_MODE,
  DOCUMENT_VIEW_MODE_POLICY_KEY,
  getDocumentViewModeValue,
  type DocumentViewMode,
} from './documentViews';

const SETTING: SettingDef = {
  key: DOCUMENT_VIEW_MODE_POLICY_KEY,
  label: 'Docling block presentation',
  description: 'Parse Blocks uses Docling-native labels and reading order. Normalized aliases are disabled.',
  fieldType: 'select',
  defaultValue: DEFAULT_DOCUMENT_VIEW_MODE,
  selectItems: [
    { label: 'Docling Native', value: 'raw_docling' },
  ],
};

export function Component() {
  useShellHeaderTitle({ title: 'Block Types', breadcrumbs: ['Settings', 'Admin', 'Docling', 'Block Types'] });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [serverValue, setServerValue] = useState<DocumentViewMode>(DEFAULT_DOCUMENT_VIEW_MODE);
  const [value, setValue] = useState<DocumentViewMode>(DEFAULT_DOCUMENT_VIEW_MODE);

  const dirty = useMemo(() => value !== serverValue, [serverValue, value]);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await edgeFetch('admin-config', { method: 'GET' });
      const text = await resp.text();
      let payload: { policies?: PolicyRow[]; error?: string } = {};
      try { payload = text ? JSON.parse(text) : {}; } catch { /* noop */ }
      if (!resp.ok) throw new Error(payload.error ?? text ?? `HTTP ${resp.status}`);

      const loaded = getDocumentViewModeValue(payload);
      setServerValue(loaded);
      setValue(loaded);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    setStatus(null);
    setSaving(true);
    try {
      const resp = await edgeFetch('admin-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_key: DOCUMENT_VIEW_MODE_POLICY_KEY,
          value,
          reason: 'Document view mode update',
        }),
      });
      const text = await resp.text();
      let payload: { error?: string } = {};
      try { payload = text ? JSON.parse(text) : {}; } catch { /* noop */ }
      if (!resp.ok) throw new Error(payload.error ?? text ?? `HTTP ${resp.status}`);

      setServerValue(value);
      setStatus({ kind: 'success', message: 'Saved document view mode.' });
    } catch (nextError) {
      setStatus({ kind: 'error', message: nextError instanceof Error ? nextError.message : String(nextError) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full overflow-auto p-4">
      <div className="mx-auto w-full max-w-3xl space-y-4">
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
            1 setting{loading && ' - loading...'}
          </p>
          {dirty && (
            <Button size="sm" className="h-7 px-3 text-xs" disabled={saving} onClick={() => void handleSave()}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          )}
        </div>

        <SettingCard
          setting={SETTING}
          value={value}
          onChange={() => setValue(DEFAULT_DOCUMENT_VIEW_MODE)}
          dirty={dirty}
          saving={saving}
          onSave={() => void handleSave()}
        />
        </div>
    </div>
  );
}


