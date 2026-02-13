import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Group, SegmentedControl, Stack, Text } from '@mantine/core';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { useAgentConfigs } from '@/components/agents/useAgentConfigs';
import { featureFlags } from '@/lib/featureFlags';
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
        <Text>Loading...</Text>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Agent onboarding" subtitle="Step 2 of 3: Select authentication method." />
        <Text c="red">{error}</Text>
      </>
    );
  }

  if (!selectedCatalog) return null;

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
      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <SegmentedControl
            value={selectedMethod}
            onChange={(value) => setAuthMethod(value as OnboardingAuthMethod)}
            data={authChoices}
          />
          {vertexBlocked && (
            <Text size="sm" c="dimmed">
              Vertex connect is disabled by feature flag. Use Gemini API key instead.
            </Text>
          )}
          <Group justify="space-between">
            <Button
              variant="light"
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
          </Group>
        </Stack>
      </Card>
    </>
  );
}
