import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import type {
  AgchainCredentialScope,
  AgchainScopedModelProvider,
  ScopedCredentialPayload,
} from '@/lib/agchainModelProviderCredentials';
import { AgchainProviderCredentialModal } from './AgchainProviderCredentialModal';
import { AgchainProviderCredentialsTable } from './AgchainProviderCredentialsTable';

type ToastState = {
  tone: 'success' | 'error';
  title: string;
  message?: string;
} | null;

type AgchainProviderCredentialsSurfaceProps = {
  scope: AgchainCredentialScope;
  rows: AgchainScopedModelProvider[];
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  onSave: (provider: AgchainScopedModelProvider, payload: ScopedCredentialPayload) => Promise<void>;
  onTest: (provider: AgchainScopedModelProvider, payload: ScopedCredentialPayload) => Promise<{ result: 'success' | 'error'; message: string }>;
  onDelete: (provider: AgchainScopedModelProvider) => Promise<void>;
};

export function AgchainProviderCredentialsSurface({
  scope,
  rows,
  loading,
  error,
  onRefresh,
  onSave,
  onTest,
  onDelete,
}: AgchainProviderCredentialsSurfaceProps) {
  const [query, setQuery] = useState('');
  const [activeProviderSlug, setActiveProviderSlug] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((provider) =>
      [
        provider.display_name,
        provider.env_var_name ?? '',
        provider.provider_category,
        provider.notes ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, rows]);

  const activeProvider = useMemo(
    () => rows.find((provider) => provider.provider_slug === activeProviderSlug) ?? null,
    [activeProviderSlug, rows],
  );

  async function handleSave(payload: ScopedCredentialPayload) {
    if (!activeProvider) return;
    setSaving(true);
    try {
      await onSave(activeProvider, payload);
      setToast({
        tone: 'success',
        title: 'Credential saved',
        message: `${activeProvider.display_name} credential saved.`,
      });
      setActiveProviderSlug(null);
    } catch (nextError) {
      setToast({
        tone: 'error',
        title: 'Unable to save credential',
        message: nextError instanceof Error ? nextError.message : String(nextError),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest(payload: ScopedCredentialPayload) {
    if (!activeProvider) return;
    setTesting(true);
    try {
      const result = await onTest(activeProvider, payload);
      setToast({
        tone: result.result === 'success' ? 'success' : 'error',
        title: result.result === 'success' ? 'Credential validated' : 'Unable to validate credential',
        message: result.message,
      });
    } catch (nextError) {
      setToast({
        tone: 'error',
        title: 'Unable to validate credential',
        message: nextError instanceof Error ? nextError.message : String(nextError),
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleRemove(provider: AgchainScopedModelProvider) {
    try {
      await onDelete(provider);
      setToast({
        tone: 'success',
        title: 'Credential removed',
        message: `${provider.display_name} credential removed.`,
      });
      if (activeProviderSlug === provider.provider_slug) {
        setActiveProviderSlug(null);
      }
    } catch (nextError) {
      setToast({
        tone: 'error',
        title: 'Unable to remove credential',
        message: nextError instanceof Error ? nextError.message : String(nextError),
      });
    }
  }

  return (
    <div className="space-y-4">
      <AgchainProviderCredentialsTable
        scope={scope}
        rows={filteredRows}
        loading={loading}
        query={query}
        onQueryChange={setQuery}
        onOpenProvider={setActiveProviderSlug}
        onRemoveProvider={(provider) => void handleRemove(provider)}
        header={(
          <div className="flex flex-wrap items-center gap-2">
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="button" variant="outline" size="sm" onClick={() => void onRefresh()}>
              Refresh
            </Button>
          </div>
        )}
      />

      {toast ? (
        <div className="fixed bottom-6 right-6 z-[70] w-[360px] max-w-[90vw] rounded-xl border border-border bg-popover p-3 shadow-lg">
          <div
            className={`rounded-lg px-3 py-2 text-sm ${
              toast.tone === 'success'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
            }`}
          >
            <p className="font-medium">{toast.title}</p>
            {toast.message ? <p className="mt-1 text-xs text-foreground/80">{toast.message}</p> : null}
          </div>
        </div>
      ) : null}

      <AgchainProviderCredentialModal
        open={activeProvider !== null}
        onOpenChange={(open) => setActiveProviderSlug(open ? activeProviderSlug : null)}
        provider={activeProvider}
        scope={scope}
        saving={saving}
        testing={testing}
        onSubmit={handleSave}
        onTest={handleTest}
        onRemove={activeProvider ? async () => handleRemove(activeProvider) : undefined}
      />
    </div>
  );
}
