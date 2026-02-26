import { useState } from 'react';
import {
  DialogRoot,
  DialogContent,
  DialogTitle,
  DialogCloseTrigger,
  DialogBody,
} from '@/components/ui/dialog';
import { notifications } from '@mantine/notifications';
import { IconInfoCircle } from '@tabler/icons-react';
import type { AgentCatalogRow, UserAgentConfigRow } from '@/lib/types';
import { edgeJson } from '@/lib/edge';
import { featureFlags } from '@/lib/featureFlags';
import type { ProviderConnectionView } from '@/components/agents/useAgentConfigs';
import { PROVIDERS } from '@/components/agents/providerRegistry';
import { GoogleAuthPanel } from '@/components/agents/forms/GoogleAuthPanel';
import { ProviderCredentialsModule } from '@/components/agents/forms/ProviderCredentialsModule';

const btnLight = 'rounded-md px-3 py-1.5 text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:pointer-events-none disabled:opacity-50';
const btnPrimary = 'rounded-md px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:pointer-events-none disabled:opacity-50';

export function AgentConfigModal({
  opened,
  onClose,
  catalog,
  config,
  readiness,
  providerKeyInfo,
  providerConnections,
  onSaveConfig,
  onReload,
}: {
  opened: boolean;
  onClose: () => void;
  catalog: AgentCatalogRow;
  config: UserAgentConfigRow | null;
  readiness: { is_ready: boolean; reasons: string[] } | null;
  providerKeyInfo: {
    key_suffix: string;
    is_valid: boolean | null;
    base_url: string | null;
    default_model?: string;
    default_temperature?: number;
    default_max_tokens?: number;
  } | null;
  providerConnections: ProviderConnectionView[];
  onSaveConfig: (patch: {
    agent_slug: string;
    keyword: string;
    model: string;
  }) => Promise<void>;
  onReload: () => Promise<void>;
}) {
  const provider = catalog.provider_family;
  const providerDef = PROVIDERS.find((p) => p.id === provider);

  const [keyword, setKeyword] = useState(config?.keyword ?? '');
  const [model, setModel] = useState(config?.model ?? catalog.default_model ?? '');

  const configured = readiness?.is_ready ?? false;
  const readinessText = readiness?.reasons?.join('; ') ?? '';

  const modelOptions = providerDef?.models ?? [];

  const saveDisabled = !keyword.trim() || !model.trim();

  const handleSave = async () => {
    try {
      await onSaveConfig({
        agent_slug: catalog.agent_slug,
        keyword,
        model,
      });
      notifications.show({ color: 'green', message: 'Saved agent config' });
      onClose();
    } catch (e) {
      notifications.show({ color: 'red', message: e instanceof Error ? e.message : String(e) });
    }
  };

  const handleSetDefault = async () => {
    try {
      await edgeJson('agent-config', {
        method: 'PATCH',
        body: JSON.stringify({ agent_slug: catalog.agent_slug, is_default: true }),
      });
      await onReload();
      notifications.show({ color: 'green', message: 'Set as default agent' });
    } catch (e) {
      notifications.show({ color: 'red', message: e instanceof Error ? e.message : String(e) });
    }
  };

  const inputClass = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';
  const selectClass = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

  return (
    <DialogRoot open={opened} onOpenChange={(e) => { if (!e.open) onClose(); }}>
      <DialogContent className="w-lg">
        <DialogCloseTrigger />
        <DialogTitle>{`Configure: ${catalog.display_name}`}</DialogTitle>
        <DialogBody>
          <div className="flex flex-col gap-4">
            {!configured && (
              <div className="flex gap-3 rounded-md border border-yellow-300 bg-yellow-50 p-3 dark:border-yellow-700 dark:bg-yellow-900/20">
                <IconInfoCircle size={16} className="mt-0.5 shrink-0 text-yellow-600 dark:text-yellow-400" />
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Needs setup</span>
                  <span className="text-sm text-yellow-700 dark:text-yellow-400">
                    {readinessText || 'Credentials are not configured yet.'}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Keyword</label>
              <span className="text-xs text-muted-foreground">Slash command alias. Example: /claude</span>
              <input
                type="text"
                className={inputClass}
                value={keyword}
                onChange={(e) => setKeyword(e.currentTarget.value)}
              />
            </div>

            {modelOptions.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Model</label>
                <select
                  className={selectClass}
                  value={model}
                  onChange={(e) => setModel(e.currentTarget.value)}
                >
                  {modelOptions.map((opt) => {
                    const value = typeof opt === 'string' ? opt : opt.value;
                    const label = typeof opt === 'string' ? opt : opt.label;
                    return (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Model</label>
                <span className="text-xs text-muted-foreground">Model identifier (for custom providers).</span>
                <input
                  type="text"
                  className={inputClass}
                  value={model}
                  onChange={(e) => setModel(e.currentTarget.value)}
                />
              </div>
            )}

            <div className="h-px bg-border" />

            <ProviderCredentialsModule provider={provider} providerKeyInfo={providerKeyInfo} onReload={onReload} />

            {provider === 'google' && (
              <>
                <div className="h-px bg-border" />
                <GoogleAuthPanel
                  providerKeyInfo={providerKeyInfo}
                  providerConnections={providerConnections}
                  providerConnectionFlowsEnabled={featureFlags.providerConnectionFlows}
                  onReload={onReload}
                  vertexOnly
                />
              </>
            )}

            <div className="mt-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button type="button" className={btnLight} onClick={handleSetDefault} disabled={!configured}>
                  Set default
                </button>
                {!featureFlags.providerConnectionFlows && provider === 'google' && (
                  <span className="text-xs text-muted-foreground">
                    Vertex connect is behind `providerConnectionFlows`.
                  </span>
                )}
              </div>

              <button type="button" className={btnPrimary} onClick={handleSave} disabled={saveDisabled}>
                Save
              </button>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
}
