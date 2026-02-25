import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { useAgentConfigs } from '@/components/agents/useAgentConfigs';
import { ApiKeyPanel } from '@/components/agents/forms/ApiKeyPanel';
import { GoogleAuthPanel } from '@/components/agents/forms/GoogleAuthPanel';
import { featureFlags } from '@/lib/featureFlags';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DEFAULT_KEYWORDS,
  supportedAuthMethods,
  type OnboardingAuthMethod,
} from '@/components/agents/onboarding/constants';

export default function AgentOnboardingConnect() {
  const navigate = useNavigate();
  const params = useParams<{ agentSlug: string; authMethod: string }>();
  const agentSlug = params.agentSlug ?? '';
  const authMethod = params.authMethod as OnboardingAuthMethod;
  const { data, loading, error, reload, saveConfig, keyByProvider, connectionsByProvider } = useAgentConfigs();
  const [notice, setNotice] = useState<
    | { tone: 'success' | 'warning' | 'error'; message: string }
    | null
  >(null);

  const selectedCatalog = useMemo(
    () => data?.catalog.find((c) => c.agent_slug === agentSlug) ?? null,
    [data?.catalog, agentSlug],
  );

  const selectedConfigured = useMemo(() => {
    if (!data || !agentSlug) return false;
    return Boolean(data.readiness?.[agentSlug]?.is_ready);
  }, [data, agentSlug]);

  useEffect(() => {
    if (!loading && data && data.default_agent_slug && data.readiness?.[data.default_agent_slug]?.is_ready) {
      navigate('/app/agents', { replace: true });
    }
  }, [loading, data, navigate]);

  useEffect(() => {
    if (loading) return;
    if (!selectedCatalog) {
      navigate('/app/onboarding/agents/select', { replace: true });
      return;
    }
    const validMethods = supportedAuthMethods(selectedCatalog.provider_family);
    if (!validMethods.includes(authMethod)) {
      navigate(`/app/onboarding/agents/auth/${selectedCatalog.agent_slug}`, { replace: true });
      return;
    }
    if (authMethod === 'vertex' && !featureFlags.providerConnectionFlows) {
      navigate(`/app/onboarding/agents/auth/${selectedCatalog.agent_slug}`, { replace: true });
    }
  }, [loading, selectedCatalog, authMethod, navigate]);

  const handleFinish = async () => {
    if (!selectedCatalog) return;
    try {
      const keyword = DEFAULT_KEYWORDS[selectedCatalog.agent_slug] ?? `/${selectedCatalog.agent_slug}`;
      const model = selectedCatalog.default_model ?? '';
      const result = await saveConfig({
        agent_slug: selectedCatalog.agent_slug,
        keyword,
        model,
        is_default: true,
      });
      if (!result.is_ready) {
        setNotice({ tone: 'warning', message: 'Agent saved, but credentials are still missing.' });
        return;
      }
      setNotice({ tone: 'success', message: 'Onboarding complete.' });
      navigate('/app/agents', { replace: true });
    } catch (e) {
      setNotice({ tone: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Agent onboarding" subtitle="Connect credentials." />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Agent onboarding" subtitle="Connect credentials." />
        <p className="text-sm text-destructive">{error}</p>
      </>
    );
  }

  if (!selectedCatalog) return null;

  const providerFamily = selectedCatalog.provider_family;
  const validMethods = supportedAuthMethods(providerFamily);
  const hasAuthChoiceStep = validMethods.length > 1;
  const stepSubtitlePrefix = hasAuthChoiceStep ? 'Step 3 of 3' : 'Step 2 of 2';
  const backPath = hasAuthChoiceStep
    ? `/app/onboarding/agents/auth/${selectedCatalog.agent_slug}`
    : `/app/onboarding/agents/select?selected=${selectedCatalog.agent_slug}`;

  return (
    <>
      <PageHeader
        title="Agent onboarding"
        subtitle={`${stepSubtitlePrefix}: Connect credentials for ${selectedCatalog.display_name}.`}
      />
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="space-y-4">
          {providerFamily === 'google' && authMethod === 'vertex' ? (
            <GoogleAuthPanel
              providerKeyInfo={keyByProvider.get('google') ?? null}
              providerConnections={connectionsByProvider.get('google') ?? []}
              providerConnectionFlowsEnabled={featureFlags.providerConnectionFlows}
              onReload={reload}
            />
          ) : (
            <ApiKeyPanel
              provider={providerFamily}
              providerKeyInfo={keyByProvider.get(providerFamily) ?? null}
              onReload={reload}
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="outline" onClick={() => navigate(backPath)}>
              Back
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => reload()}>
                Refresh status
              </Button>
              <Button onClick={handleFinish} disabled={!selectedConfigured}>
                Finish
              </Button>
            </div>
          </div>

          {!selectedConfigured && (
            <p className="text-sm text-muted-foreground">
              Finish is enabled after credentials are configured.
            </p>
          )}
          {notice && (
            <div
              className={cn(
                'rounded-md border px-3 py-2 text-sm',
                notice.tone === 'success' && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600',
                notice.tone === 'warning' && 'border-amber-500/40 bg-amber-500/10 text-amber-600',
                notice.tone === 'error' && 'border-destructive/40 bg-destructive/10 text-destructive',
              )}
            >
              {notice.message}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
