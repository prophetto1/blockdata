import { useMemo, useState } from 'react';
import { edgeJson } from '@/lib/edge';
import type { ProviderConnectionView } from '@/components/agents/useAgentConfigs';
import { ApiKeyPanel } from '@/components/agents/forms/ApiKeyPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type GoogleAuthMode = 'gemini_key' | 'vertex_service_account';

export function GoogleAuthPanel({
  providerKeyInfo,
  providerConnections,
  providerConnectionFlowsEnabled,
  onReload,
  vertexOnly = false,
}: {
  providerKeyInfo: { key_suffix: string; is_valid: boolean | null; base_url: string | null } | null;
  providerConnections: ProviderConnectionView[];
  providerConnectionFlowsEnabled: boolean;
  onReload: () => Promise<void>;
  vertexOnly?: boolean;
}) {
  const [mode, setMode] = useState<GoogleAuthMode>(vertexOnly ? 'vertex_service_account' : 'gemini_key');
  const vertex = useMemo(
    () => providerConnections.find((c) => c.connection_type === 'gcp_service_account') ?? null,
    [providerConnections],
  );

  const [location, setLocation] = useState<string>(
    typeof vertex?.metadata_jsonb?.location === 'string' ? (vertex?.metadata_jsonb.location as string) : 'us-central1',
  );
  const [serviceAccountJson, setServiceAccountJson] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [notice, setNotice] = useState<
    | { tone: 'success' | 'warning' | 'error'; message: string }
    | null
  >(null);

  const connected = vertex?.status === 'connected';

  const handleConnect = async () => {
    if (!providerConnectionFlowsEnabled) {
      setNotice({ tone: 'warning', message: 'Vertex connection flows are disabled by feature flag.' });
      return;
    }
    setNotice(null);
    setConnecting(true);
    try {
      await edgeJson('provider-connections/connect', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'google',
          connection_type: 'gcp_service_account',
          location,
          service_account_json: serviceAccountJson,
        }),
      });
      setNotice({ tone: 'success', message: 'Vertex connected.' });
      setServiceAccountJson('');
      await onReload();
    } catch (e) {
      setNotice({ tone: 'error', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!providerConnectionFlowsEnabled) return;
    setNotice(null);
    setDisconnecting(true);
    try {
      await edgeJson('provider-connections/disconnect', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'google',
          connection_type: 'gcp_service_account',
        }),
      });
      setNotice({ tone: 'success', message: 'Vertex disconnected.' });
      await onReload();
    } catch (e) {
      setNotice({ tone: 'error', message: e instanceof Error ? e.message : String(e) });
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">Google auth</p>
        {connected && (
          <p className="text-sm text-muted-foreground">
            Vertex connected
          </p>
        )}
      </div>

      {!vertexOnly && (
        <div className="inline-flex w-full rounded-md border border-border bg-muted p-1" role="tablist" aria-label="Google auth mode">
          {[
            { value: 'gemini_key', label: 'Gemini API key' },
            { value: 'vertex_service_account', label: 'Vertex AI (service account)' },
          ].map((item) => {
            const active = mode === item.value;
            return (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMode(item.value as GoogleAuthMode)}
                className={cn(
                  'flex-1 rounded-sm px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}

      {mode === 'gemini_key' ? (
        <ApiKeyPanel provider="google" providerKeyInfo={providerKeyInfo} onReload={onReload} />
      ) : (
        <div className="space-y-3">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-foreground">Location</span>
            <span className="text-xs text-muted-foreground">Vertex location (e.g., us-central1)</span>
            <Input value={location} onChange={(e) => setLocation(e.currentTarget.value)} />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-foreground">Service account JSON</span>
            <span className="text-xs text-muted-foreground">
              Paste the full service account JSON. Stored encrypted server-side.
            </span>
            <textarea
              className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={serviceAccountJson}
              onChange={(e) => setServiceAccountJson(e.currentTarget.value)}
              disabled={connected}
            />
          </label>
          <div className="flex justify-end">
            {connected ? (
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={disconnecting || !providerConnectionFlowsEnabled}
              >
                Disconnect
              </Button>
            ) : (
              <Button
                onClick={handleConnect}
                disabled={connecting || !providerConnectionFlowsEnabled || !location.trim() || !serviceAccountJson.trim()}
              >
                Connect
              </Button>
            )}
          </div>
          {!providerConnectionFlowsEnabled && (
            <p className="text-xs text-muted-foreground">
              Vertex connect is disabled by feature flag.
            </p>
          )}
        </div>
      )}
      {notice && (
        <div
          className={cn(
            'rounded-md border px-3 py-2 text-xs',
            notice.tone === 'success' && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600',
            notice.tone === 'warning' && 'border-amber-500/40 bg-amber-500/10 text-amber-600',
            notice.tone === 'error' && 'border-destructive/40 bg-destructive/10 text-destructive',
          )}
        >
          {notice.message}
        </div>
      )}
    </div>
  );
}
