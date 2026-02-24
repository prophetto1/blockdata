import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Center,
  Group,
  Pill,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import {
  IconFilter,
  IconPlayerPlay,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconUpload,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { AppBreadcrumbs } from '@/components/common/AppBreadcrumbs';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';

type FlowListRow = {
  flowId: string;
  flowName: string;
  namespace: string;
  updatedAt: string;
  triggersCount: number;
  lastExecutionStatus: 'SUCCESS' | 'WARNING' | 'FAILED';
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString();
}

function statusByIndex(index: number): FlowListRow['lastExecutionStatus'] {
  const value = index % 3;
  if (value === 0) return 'SUCCESS';
  if (value === 1) return 'WARNING';
  return 'FAILED';
}

function statusColor(status: FlowListRow['lastExecutionStatus']): 'green' | 'yellow' | 'red' {
  if (status === 'SUCCESS') return 'green';
  if (status === 'WARNING') return 'yellow';
  return 'red';
}

export default function Flows() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<FlowListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useShellHeaderTitle({
    title: 'Flows',
    subtitle: 'Kestra-like flow shell',
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from(TABLES.projects)
        .select('project_id, project_name, workspace_id, updated_at')
        .order('updated_at', { ascending: false });

      if (cancelled) return;

      if (queryError) {
        setRows([]);
        setError(queryError.message);
        setLoading(false);
        return;
      }

      const nextRows: FlowListRow[] = ((data ?? []) as Array<Record<string, unknown>>).map((row, index) => ({
        flowId: String(row.project_id ?? ''),
        flowName: String(row.project_name ?? 'Untitled flow'),
        namespace: String(row.workspace_id ?? 'default'),
        updatedAt: String(row.updated_at ?? ''),
        triggersCount: (index % 3) + 1,
        lastExecutionStatus: statusByIndex(index),
      }));

      setRows(nextRows.filter((row) => row.flowId.length > 0));
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;

    return rows.filter((row) => (
      row.flowName.toLowerCase().includes(normalized)
      || row.namespace.toLowerCase().includes(normalized)
      || row.flowId.toLowerCase().includes(normalized)
    ));
  }, [query, rows]);

  return (
    <Stack gap="md" className="flows-shell">
      <AppBreadcrumbs items={[{ label: 'Flows' }]} />

      <Paper withBorder p="md" radius="md" style={{ minHeight: 520 }} className="flows-shell-paper">
        <Stack gap="sm" h="100%">
          <Group justify="space-between" align="center" wrap="nowrap" className="flows-header">
            <Text fw={700} size="lg">Flows</Text>
            <Group gap="xs" wrap="nowrap" className="flows-header-actions">
              <Button size="compact-sm" variant="default" leftSection={<IconUpload size={14} />}>
                Import
              </Button>
              <Button size="compact-sm" variant="default" leftSection={<IconSearch size={14} />}>
                Source search
              </Button>
              <Button size="compact-sm" leftSection={<IconPlus size={14} />}>
                Create
              </Button>
            </Group>
          </Group>

          <Group justify="space-between" align="center" wrap="nowrap" gap="xs" className="flows-filter-bar">
            <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }} className="flows-filter-actions">
              <Button size="compact-sm" variant="default" leftSection={<IconFilter size={14} />}>
                Add filters
              </Button>
              <TextInput
                size="xs"
                placeholder="Search flows"
                leftSection={<IconSearch size={14} />}
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                style={{ width: 260 }}
              />
              <Badge variant="light">Scope: USER</Badge>
              <Button
                size="compact-sm"
                variant="subtle"
                onClick={() => setQuery('')}
                disabled={query.trim().length === 0}
              >
                Clear all
              </Button>
            </Group>

            <ActionIcon
              size="sm"
              variant="subtle"
              aria-label="Refresh data"
              onClick={() => window.location.reload()}
            >
              <IconRefresh size={16} />
            </ActionIcon>
          </Group>

          {error && (
            <Alert color="red" variant="light">
              {error}
            </Alert>
          )}

          {loading ? (
            <Center style={{ minHeight: 240 }}>
              <Loader size="sm" />
            </Center>
          ) : filteredRows.length === 0 ? (
            <Center style={{ minHeight: 240 }}>
              <Text size="sm" c="dimmed">No flows available.</Text>
            </Center>
          ) : (
            <ScrollArea type="auto" style={{ minHeight: 0, flex: 1 }} className="flows-table-wrap">
              <Table stickyHeader highlightOnHover withTableBorder className="flows-table">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Id</Table.Th>
                    <Table.Th>Labels</Table.Th>
                    <Table.Th>Namespace</Table.Th>
                    <Table.Th>Last execution date</Table.Th>
                    <Table.Th>Last execution status</Table.Th>
                    <Table.Th>Triggers</Table.Th>
                    <Table.Th style={{ width: 120 }}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredRows.map((row) => (
                    <Table.Tr key={row.flowId} className="flows-table-row">
                      <Table.Td>
                        <Button
                          variant="subtle"
                          size="compact-sm"
                          px={0}
                          onClick={() => navigate(`/app/flows/${row.flowId}/overview`)}
                        >
                          {row.flowName}
                        </Button>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={6}>
                          <Pill withRemoveButton={false} size="xs">name:{row.flowName}</Pill>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" c="dimmed">{row.namespace}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" c="dimmed">{formatDateTime(row.updatedAt)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge size="sm" variant="light" color={statusColor(row.lastExecutionStatus)}>
                          {row.lastExecutionStatus}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge size="sm" variant="dot">{row.triggersCount}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4} wrap="nowrap">
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            aria-label="Run flow"
                          >
                            <IconPlayerPlay size={16} />
                          </ActionIcon>
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            aria-label="Open flow"
                            onClick={() => navigate(`/app/flows/${row.flowId}/overview`)}
                          >
                            <IconSearch size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
