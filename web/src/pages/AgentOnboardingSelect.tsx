import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Center, Group, Loader, SimpleGrid, Stack, Text } from '@mantine/core';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { useAgentConfigs } from '@/components/agents/useAgentConfigs';
import { onboardingNextPath } from '@/components/agents/onboarding/constants';

export default function AgentOnboardingSelect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedFromQuery = searchParams.get('selected');
  const { data, loading, error } = useAgentConfigs();
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
            const isSelected = selectedSlug === cat.agent_slug;
            return (
              <Card
                key={cat.agent_slug}
                withBorder
                radius="md"
                p="lg"
                style={{
                  outline: isSelected ? '2px solid var(--mantine-color-blue-6)' : 'none',
                  borderRadius: 10,
                }}
              >
                <Stack gap="sm">
                  <Group justify="space-between" align="flex-start">
                    <Stack gap={2}>
                      <Text fw={700}>{cat.display_name}</Text>
                      <Text size="sm" c="dimmed">
                        {cat.provider_family}
                      </Text>
                    </Stack>
                    <Group gap={6}>
                      {isSelected && <Badge color="blue">Selected</Badge>}
                      <Badge color={configured ? 'green' : 'gray'} variant={configured ? 'filled' : 'light'}>
                        {configured ? 'Configured' : 'Needs setup'}
                      </Badge>
                    </Group>
                  </Group>
                  <Button
                    variant={isSelected ? 'filled' : 'light'}
                    onClick={() => {
                      setSelectedSlug(cat.agent_slug);
                      navigate(onboardingNextPath(cat.agent_slug, cat.provider_family));
                    }}
                  >
                    Select
                  </Button>
                </Stack>
              </Card>
            );
          })}
        </SimpleGrid>
      </Stack>
    </>
  );
}
