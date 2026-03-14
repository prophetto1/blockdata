import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { edgeFetch } from '@/lib/edge';
import { SettingCard, type PolicyRow, type SettingDef } from '@/pages/settings/setting-card-shared';
import {
  DOCUMENT_VIEW_MODE_POLICY_KEY,
  getDocumentViewModeValue,
  type DocumentViewMode,
} from './documentViews';

const SETTING: SettingDef = {
  key: DOCUMENT_VIEW_MODE_POLICY_KEY,
  label: 'Docling block presentation',
  description: 'Choose whether the Parse Blocks tab shows Blockdata-normalized blocks or Docling-native items in reading order.',
  fieldType: 'select',
  defaultValue: 'normalized',
  selectItems: [
    { label: 'Normalized', value: 'normalized' },
    { label: 'Raw Docling', value: 'raw_docling' },
  ],
};

export function Component() {
  useShellHeaderTitle({ title: 'Block Types', breadcrumbs: ['Settings', 'Admin', 'Docling', 'Block Types'] });

  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [serverValue, setServerValue] = useState<DocumentViewMode>('normalized');
  const [value, setValue] = useState<DocumentViewMode>('normalized');

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
    <div className="flex h-full min-h-0 overflow-hidden">
      <nav className="w-56 shrink-0 border-r border-border">
        <div className="p-2">
          <button
            type="button"
            className="flex w-full items-center rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition hover:bg-accent/50 hover:text-foreground"
            onClick={() => navigate('/app/superuser/parsers-docling')}
          >
            Profiles
          </button>
          <button
            type="button"
            className="mt-1 flex w-full items-center rounded-md bg-accent px-2.5 py-1.5 text-sm font-medium text-accent-foreground"
            aria-current="page"
          >
            Block Types
          </button>
        </div>
      </nav>

      <div className="min-w-0 flex flex-1 flex-col overflow-auto p-4">
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
          onChange={(_key, nextValue) => setValue(nextValue === 'raw_docling' ? 'raw_docling' : 'normalized')}
          dirty={dirty}
          saving={saving}
          onSave={() => void handleSave()}
        />
        </div>
      </div>
    </div>
  );
}


