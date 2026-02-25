import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { useAgentConfigs } from '@/components/agents/useAgentConfigs';
import { featureFlags } from '@/lib/featureFlags';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  defaultAuthMethod,
  supportedAuthMethods,
  type OnboardingAuthMethod,
} from '@/components/agents/onboarding/constants';

export default function AgentOnboardingAuth() {
  const navigate = useNavigate();
  const params = useParams<{ agentSlug: string }>();
  const agentSlug = params.agentSlug ?? '';
  const { data, loading, error } = useAgentConfigs();
  const [authMethod, setAuthMethod] = useState<OnboardingAuthMethod>('api_key');

  const selectedCatalog = useMemo(
    () => data?.catalog.find((c) => c.agent_slug === agentSlug) ?? null,
    [data?.catalog, agentSlug],
  );

  const methods = useMemo(
    () => (selectedCatalog ? supportedAuthMethods(selectedCatalog.provider_family) : []),
    [selectedCatalog],
  );

  useEffect(() => {
    if (loading || !selectedCatalog) return;
    if (methods.length === 0) {
      navigate('/app/onboarding/agents/select', { replace: true });
      return;
    }
    if (methods.length === 1) {
      navigate(`/app/onboarding/agents/connect/${selectedCatalog.agent_slug}/${methods[0]}`, { replace: true });
    }
  }, [loading, selectedCatalog, methods, navigate]);

  useEffect(() => {
    if (!loading && data && data.default_agent_slug && data.readiness?.[data.default_agent_slug]?.is_ready) {
      navigate('/app/agents', { replace: true });
    }
  }, [loading, data, navigate]);

  useEffect(() => {
    if (!loading && !selectedCatalog) {
      navigate('/app/onboarding/agents/select', { replace: true });
    }
  }, [loading, selectedCatalog, navigate]);

  if (loading) {
    return (
      <>
        <PageHeader title="Agent onboarding" subtitle="Step 2 of 3: Select authentication method." />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Agent onboarding" subtitle="Step 2 of 3: Select authentication method." />
        <p className="text-sm text-destructive">{error}</p>
      </>
    );
  }

  if (!selectedCatalog) return null;
  if (methods.length <= 1) return null;

  const selectedMethod = methods.includes(authMethod)
    ? authMethod
    : (methods[0] ?? defaultAuthMethod(selectedCatalog.provider_family));
  const vertexBlocked = selectedMethod === 'vertex' && !featureFlags.providerConnectionFlows;
  const authChoices = methods.map((m) => ({
    value: m,
    label: m === 'api_key' ? 'API key' : m === 'vertex' ? 'Vertex AI' : 'Custom endpoint',
  }));

  return (
    <>
      <PageHeader
        title="Agent onboarding"
        subtitle={`Step 2 of 3: Select authentication method for ${selectedCatalog.display_name}.`}
      />
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="space-y-4">
          <div
            role="tablist"
            aria-label="Authentication method"
            className="inline-flex w-full rounded-md border border-border bg-muted p-1"
          >
            {authChoices.map((choice) => {
              const active = selectedMethod === choice.value;
              return (
                <button
                  key={choice.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setAuthMethod(choice.value as OnboardingAuthMethod)}
                  className={cn(
                    'flex-1 rounded-sm px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {choice.label}
                </button>
              );
            })}
          </div>
          {vertexBlocked && (
            <p className="text-sm text-muted-foreground">
              Vertex connect is disabled by feature flag. Use Gemini API key instead.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/app/onboarding/agents/select?selected=${selectedCatalog.agent_slug}`)}
            >
              Back
            </Button>
            <Button
              disabled={vertexBlocked}
              onClick={() =>
                navigate(
                  `/app/onboarding/agents/connect/${selectedCatalog.agent_slug}/${selectedMethod}`,
                )
              }
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
