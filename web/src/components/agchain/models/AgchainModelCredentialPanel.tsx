import { useMemo, useState } from 'react';
import type { AgchainProviderRow } from '@/lib/agchainModelProviders';
import { Button } from '@/components/ui/button';

const MASKED_KEY = '\u2022\u2022\u2022\u2022';

type AgchainModelCredentialPanelProps = {
  providerRow: AgchainProviderRow;
  saving: boolean;
  onConnect: (apiKey: string) => Promise<unknown>;
  onDisconnect: () => Promise<unknown>;
};

export function AgchainModelCredentialPanel({
  providerRow,
  saving,
  onConnect,
  onDisconnect,
}: AgchainModelCredentialPanelProps) {
  const anchorTarget = useMemo(
    () =>
      providerRow.targets.find((target) => target.model_target_id === providerRow.credential_anchor_target_id) ?? null,
    [providerRow],
  );

  return (
    <AgchainModelCredentialPanelContent
      key={`${providerRow.provider_slug}:${providerRow.credential_anchor_target_id ?? 'none'}`}
      providerRow={providerRow}
      anchorTarget={anchorTarget}
      saving={saving}
      onConnect={onConnect}
      onDisconnect={onDisconnect}
    />
  );
}

type AgchainModelCredentialPanelContentProps = AgchainModelCredentialPanelProps & {
  anchorTarget: AgchainProviderRow['targets'][number] | null;
};

function AgchainModelCredentialPanelContent({
  providerRow,
  anchorTarget,
  saving,
  onConnect,
  onDisconnect,
}: AgchainModelCredentialPanelContentProps) {
  const [apiKey, setApiKey] = useState('');
  const [showInput, setShowInput] = useState(false);

  if (!anchorTarget) {
    const authKind =
      providerRow.targets[0]?.auth_kind ?? providerRow.provider_definition.supported_auth_kinds[0] ?? 'provider-managed';

    return (
      <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Credentials</p>
        <p className="mt-2 text-sm text-foreground">Auth type: {authKind}. Configure in Settings / Connections.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          No eligible API-key target is configured for this provider yet.
        </p>
      </div>
    );
  }

  const isReady = anchorTarget.credential_status === 'ready';
  const needsAttention =
    anchorTarget.credential_status === 'invalid' || anchorTarget.credential_status === 'disconnected';
  const statusLabel = isReady
    ? `Connected (${MASKED_KEY}${anchorTarget.key_suffix ?? '????'})`
    : needsAttention
      ? 'Connection needs attention'
      : 'Not connected';

  async function handleConnect() {
    await onConnect(apiKey);
    setApiKey('');
    setShowInput(false);
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Provider credential</p>
      <div className="mt-2 flex items-center gap-2">
        <p className="text-sm text-foreground">{statusLabel}</p>
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            isReady ? 'bg-green-500' : needsAttention ? 'bg-red-500' : 'bg-amber-500'
          }`}
        />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        This credential applies to all targets under this provider for your account.
      </p>

      {(showInput || !isReady) ? (
        <div className="mt-3 flex gap-2">
          <input
            type="password"
            className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
            placeholder="sk-..."
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
          <Button type="button" size="sm" disabled={saving || !apiKey.trim()} onClick={() => void handleConnect()}>
            {saving ? 'Saving...' : isReady ? 'Replace' : 'Connect'}
          </Button>
        </div>
      ) : null}

      <div className="mt-3 flex gap-2">
        {isReady && !showInput ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowInput(true)}>
            Replace Key
          </Button>
        ) : null}
        {(isReady || needsAttention) ? (
          <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => void onDisconnect()}>
            Disconnect
          </Button>
        ) : null}
      </div>
    </div>
  );
}
