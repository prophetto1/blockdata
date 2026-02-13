import { useEffect, useMemo, useState } from 'react';
import { Button, Center, Loader, SimpleGrid, Stack, Text } from '@mantine/core';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { AgentCard } from '@/components/agents/AgentCard';
import { useAgentConfigs } from '@/components/agents/useAgentConfigs';

export default function AgentOnboardingSelect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedFromQuery = searchParams.get('selected');
  const { data, loading, error, configBySlug } = useAgentConfigs();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(selectedFromQuery);

  useEffect(() => {
    setSelectedSlug(selectedFromQuery);
  }, [selectedFromQuery]);

  useEffect(() => {
    if (!loading && data && data.default_agent_slug && data.readiness?.[data.default_agent_slug]?.is_ready) {
      navigate('/app/agents', { replace: true });
    }
  }, [loading, data, navigate]);

  const catalog = useMemo(() => data?.catalog ?? [], [data?.catalog]);

  if (loading) {
    return (
      <>
        <PageHeader title="Agent onboarding" subtitle="Step 1 of 3: Select your default agent." />
        <Center py="xl">
          <Loader />
        </Center>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Agent onboarding" subtitle="Step 1 of 3: Select your default agent." />
        <Text c="red">{error}</Text>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Agent onboarding" subtitle="Step 1 of 3: Select your default agent." />
      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {catalog.map((cat) => {
            const readiness = data?.readiness?.[cat.agent_slug];
            const configured = Boolean(readiness?.is_ready);
            const cfg = configBySlug.get(cat.agent_slug) ?? null;
            const isDefault = data?.default_agent_slug === cat.agent_slug;
            const isSelected = selectedSlug === cat.agent_slug;
            return (
              <div
                key={cat.agent_slug}
                style={{
                  outline: isSelected ? '2px solid var(--mantine-color-blue-6)' : 'none',
                  borderRadius: 10,
                }}
              >
                <AgentCard
                  catalog={cat}
                  isDefault={isDefault}
                  configured={configured}
                  keyword={cfg?.keyword ?? ''}
                  canSetDefault={false}
                  onConfigure={() => setSelectedSlug(cat.agent_slug)}
                  onSetDefault={() => undefined}
                />
              </div>
            );
          })}
        </SimpleGrid>
        <Button
          style={{ alignSelf: 'flex-end' }}
          disabled={!selectedSlug}
          onClick={() => selectedSlug && navigate(`/app/onboarding/agents/auth/${selectedSlug}`)}
        >
          Continue
        </Button>
      </Stack>
    </>
  );
}
