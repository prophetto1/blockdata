import { Badge, Box, Button, Card, Group, SegmentedControl, Select, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { PageHeader } from '@/components/common/PageHeader';

const SAMPLE_ROWS = [
  { name: 'events_2026_02', type: 'Delta', updated: '2 min ago', owner: 'you', status: 'Healthy' },
  { name: 'customer_dim', type: 'Table', updated: '1 hour ago', owner: 'analytics', status: 'Healthy' },
  { name: 'runs_daily', type: 'View', updated: 'Yesterday', owner: 'pipeline', status: 'Degraded' },
];

export default function DatabricksStyleLab() {
  return (
    <Box className="dbx-lab">
      <PageHeader title="Style Lab" subtitle="Databricks-like chrome preview" />

      <Box className="dbx-lab-hero">
        <Stack gap={6}>
          <Title order={2} className="dbx-lab-title">
            Workspace
          </Title>
          <Text className="dbx-lab-subtitle">
            This page is an isolated styling sandbox. Changes here should not affect other pages.
          </Text>
        </Stack>
        <Group gap="sm" wrap="wrap" className="dbx-lab-hero-actions">
          <TextInput
            placeholder="Search assets"
            className="dbx-lab-search"
          />
          <Select
            placeholder="Environment"
            data={['Dev', 'Staging', 'Prod']}
            defaultValue="Dev"
            comboboxProps={{ withinPortal: false }}
            className="dbx-lab-select"
          />
          <Button leftSection={<IconPlus size={16} />} className="dbx-lab-primary">
            New
          </Button>
        </Group>
      </Box>

      <Box className="dbx-lab-grid">
        <Card withBorder radius="md" className="dbx-panel">
          <Group justify="space-between" align="center" wrap="wrap" mb="sm">
            <Text fw={650}>Recent assets</Text>
            <SegmentedControl
              data={['All', 'Tables', 'Views']}
              defaultValue="All"
              size="xs"
              className="dbx-lab-seg"
            />
          </Group>

          <Table
            className="dbx-table"
            withTableBorder
            withColumnBorders={false}
            highlightOnHover
            verticalSpacing="xs"
            horizontalSpacing="md"
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Owner</Table.Th>
                <Table.Th>Updated</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {SAMPLE_ROWS.map((row) => (
                <Table.Tr key={row.name}>
                  <Table.Td>
                    <Text fw={600} className="dbx-table-name">{row.name}</Text>
                  </Table.Td>
                  <Table.Td><Text className="dbx-table-dim">{row.type}</Text></Table.Td>
                  <Table.Td><Text className="dbx-table-dim">{row.owner}</Text></Table.Td>
                  <Table.Td><Text className="dbx-table-dim">{row.updated}</Text></Table.Td>
                  <Table.Td>
                    <Badge
                      variant="light"
                      color={row.status === 'Degraded' ? 'red' : 'green'}
                      size="sm"
                    >
                      {row.status}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>

        <Card withBorder radius="md" className="dbx-panel">
          <Stack gap="sm">
            <Group justify="space-between" align="flex-start" wrap="wrap">
              <Box>
                <Text fw={650}>Compute</Text>
                <Text className="dbx-table-dim">Tighter chrome, stronger borders, calmer accents.</Text>
              </Box>
              <Badge variant="outline" color="gray">
                Preview
              </Badge>
            </Group>

            <Box className="dbx-metric-row">
              <Box className="dbx-metric">
                <Text className="dbx-metric-label">Cluster</Text>
                <Text className="dbx-metric-value">shared-small</Text>
              </Box>
              <Box className="dbx-metric">
                <Text className="dbx-metric-label">Runtime</Text>
                <Text className="dbx-metric-value">14.x</Text>
              </Box>
              <Box className="dbx-metric">
                <Text className="dbx-metric-label">State</Text>
                <Text className="dbx-metric-value">Running</Text>
              </Box>
            </Box>

            <Group justify="flex-end" gap="sm" wrap="wrap">
              <Button variant="default">Edit</Button>
              <Button>Open</Button>
            </Group>
          </Stack>
        </Card>
      </Box>
    </Box>
  );
}

