import { useMemo, useState } from 'react';
import { IconPlugConnected } from '@tabler/icons-react';
import { edgeJson } from '@/lib/edge';
import { PROVIDERS } from '@/components/agents/providerRegistry';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type TestStatus = 'idle' | 'testing' | 'valid' | 'invalid';

export function ApiKeyPanel({
  provider,
  providerKeyInfo,
  onReload,
}: {
  provider: string;
  providerKeyInfo: { key_suffix: string; is_valid: boolean | null; base_url: string | null } | null;
  onReload: () => Promise<void>;
}) {
  const def = useMemo(() => PROVIDERS.find((p) => p.id === provider), [provider]);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(providerKeyInfo?.base_url ?? '');
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testError, setTestError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<
    | { tone: 'success' | 'error'; message: string }
    | null
  >(null);

  const existingSuffix = providerKeyInfo?.key_suffix?.trim() || '';
  const hasExisting = existingSuffix.length === 4;
  const hasBaseUrlField = provider === 'custom';
  const requiresBaseUrl = provider === 'custom';

  const canTest = apiKey.trim().length > 0 && (!requiresBaseUrl || baseUrl.trim().length > 0);

  const handleTest = async () => {
    setTestStatus('testing');
    setTestError(null);
    setNotice(null);
    try {
      const result = await edgeJson<{ valid: boolean; error?: string }>('test-api-key', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          api_key: apiKey,
          ...(hasBaseUrlField ? { base_url: baseUrl.trim() || null } : {}),
        }),
      });
      if (result.valid) {
        setTestStatus('valid');
      } else {
        setTestStatus('invalid');
        setTestError(result.error ?? 'Test failed');
      }
    } catch (e) {
      setTestStatus('invalid');
      setTestError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await edgeJson('user-api-keys', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          api_key: apiKey,
          ...(hasBaseUrlField ? { base_url: baseUrl.trim() || null } : {}),
        }),
      });
      setNotice({ tone: 'success', message: 'Saved API key.' });
      setApiKey('');
      setTestStatus('idle');
      setTestError(null);
      await onReload();
    } catch (e) {
      setNotice({ tone: 'error', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">Credentials</p>
        {hasExisting && (
          <p className="text-sm text-muted-foreground">
            Saved key ending in {existingSuffix}
          </p>
        )}
      </div>

      {hasBaseUrlField && (
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-foreground">Base URL</span>
          <span className="text-xs text-muted-foreground">
            OpenAI-compatible endpoint base (e.g., http://localhost:1234/v1)
          </span>
          <Input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.currentTarget.value)}
            required={requiresBaseUrl}
          />
        </label>
      )}

      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-foreground">API key</span>
          <Input
            type="password"
            placeholder={hasExisting ? 'Enter new key to replace' : def?.keyPlaceholder ?? 'Paste API key...'}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.currentTarget.value);
              setTestStatus('idle');
              setTestError(null);
              setNotice(null);
            }}
          />
        </label>
        <div>
          <Button
            variant="outline"
            onClick={handleTest}
            title="Send a minimal API call to verify the key"
            disabled={!canTest}
            className="w-full md:w-auto"
          >
            <IconPlugConnected size={16} />
            {testStatus === 'valid' ? 'Valid' : testStatus === 'invalid' ? 'Failed' : 'Test'}
          </Button>
        </div>
        <Button onClick={handleSave} disabled={saving || !apiKey.trim() || (requiresBaseUrl && !baseUrl.trim())}>
          Save
        </Button>
      </div>

      {testStatus === 'valid' && <p className="text-xs text-emerald-600">Key verified.</p>}
      {testStatus === 'invalid' && testError && <p className="text-xs text-destructive">{testError}</p>}

      {def?.keyHelpUrl && (
        <p className="text-xs text-muted-foreground">
          Get a key at{' '}
          <a
            href={def.keyHelpUrl}
            target="_blank"
            rel="noopener"
            className="font-medium text-primary underline underline-offset-2"
          >
            {new URL(def.keyHelpUrl).hostname}
          </a>
          .
        </p>
      )}
      {notice && (
        <div
          className={cn(
            'rounded-md border px-3 py-2 text-xs',
            notice.tone === 'success' && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600',
            notice.tone === 'error' && 'border-destructive/40 bg-destructive/10 text-destructive',
          )}
        >
          {notice.message}
        </div>
      )}
    </div>
  );
}
