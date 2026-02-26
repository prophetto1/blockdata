import { useEffect, useMemo, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { AgentCard } from '@/components/agents/AgentCard';
import { AgentConfigModal } from '@/components/agents/AgentConfigModal';
import { useAgentConfigs } from '@/components/agents/useAgentConfigs';

export default function Agents() {
  const navigate = useNavigate();
  const { data, loading, error, saveConfig, reload, configBySlug, keyByProvider, connectionsByProvider } = useAgentConfigs();
  const [query, setQuery] = useState('');
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const defaultConfigured = useMemo(() => {
    if (!data) return false;
    const slug = data.default_agent_slug;
    if (!slug) return false;
    return Boolean(data.readiness?.[slug]?.is_ready);
  }, [data]);

  // First-time redirect: no configured default agent.
  useEffect(() => {
    if (!loading && data && !defaultConfigured) {
      navigate('/app/onboarding/agents/select', { replace: true });
    }
  }, [loading, data, defaultConfigured, navigate]);

  const filteredCatalog = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = data?.catalog ?? [];
    if (!q) return rows;
    return rows.filter((c) =>
      `${c.display_name} ${c.agent_slug} ${c.provider_family}`.toLowerCase().includes(q)
    );
  }, [data?.catalog, query]);

  const activeCatalog = activeSlug ? data?.catalog.find((c) => c.agent_slug === activeSlug) ?? null : null;
  const activeConfig = activeSlug ? configBySlug.get(activeSlug) ?? null : null;
  const activeReadiness = activeSlug ? data?.readiness?.[activeSlug] ?? null : null;

  if (loading) {
    return (
      <>
        <PageHeader title="Agents" subtitle="Configure provider credentials, keywords, and default agent selection." />
        <div className="flex items-center justify-center py-10">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Agents" subtitle="Configure provider credentials, keywords, and default agent selection." />
        <span className="text-destructive">{error}</span>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Agents" subtitle="Configure provider credentials, keywords, and default agent selection." />

      <input
        type="text"
        placeholder="Search agents..."
        className="mb-4 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCatalog.map((cat) => {
          const readiness = data?.readiness?.[cat.agent_slug];
          const configured = Boolean(readiness?.is_ready);
          const cfg = configBySlug.get(cat.agent_slug) ?? null;
          const keyword = cfg?.keyword ?? '';
          const isDefault = data?.default_agent_slug === cat.agent_slug;

          return (
            <AgentCard
              key={cat.agent_slug}
              catalog={cat}
              isDefault={isDefault}
              configured={configured}
              keyword={keyword}
              canSetDefault={configured && !isDefault}
              hideSetDefault={isDefault}
              onConfigure={() => setActiveSlug(cat.agent_slug)}
              onSetDefault={async () => {
                try {
                  await saveConfig({ agent_slug: cat.agent_slug, is_default: true });
                  notifications.show({ color: 'green', message: 'Set default agent' });
                } catch (e) {
                  notifications.show({ color: 'red', message: e instanceof Error ? e.message : String(e) });
                }
              }}
            />
          );
        })}
      </div>

      {activeCatalog && (
        <AgentConfigModal
          key={activeCatalog.agent_slug}
          opened={activeCatalog != null}
          onClose={() => setActiveSlug(null)}
          catalog={activeCatalog}
          config={activeConfig}
          readiness={activeReadiness}
          providerKeyInfo={
            keyByProvider.get(activeCatalog.provider_family)
              ? {
                  key_suffix: keyByProvider.get(activeCatalog.provider_family)!.key_suffix,
                  is_valid: keyByProvider.get(activeCatalog.provider_family)!.is_valid,
                  base_url: keyByProvider.get(activeCatalog.provider_family)!.base_url,
                  default_model: keyByProvider.get(activeCatalog.provider_family)!.default_model,
                  default_temperature: keyByProvider.get(activeCatalog.provider_family)!.default_temperature,
                  default_max_tokens: keyByProvider.get(activeCatalog.provider_family)!.default_max_tokens,
                }
              : null
          }
          providerConnections={connectionsByProvider.get(activeCatalog.provider_family) ?? []}
          onReload={reload}
          onSaveConfig={async (patch) => {
            await saveConfig(patch);
          }}
        />
      )}
    </>
  );
}
