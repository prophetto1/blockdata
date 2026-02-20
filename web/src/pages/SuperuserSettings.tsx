import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  NavLink,
  NumberInput,
  Paper,
  Stack,
  Switch,
  TagsInput,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAdjustments, IconBuildingFactory, IconHistory, IconUpload } from '@tabler/icons-react';
import { edgeFetch } from '@/lib/edge';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorAlert } from '@/components/common/ErrorAlert';

type PolicyValueType = 'boolean' | 'integer' | 'number' | 'string' | 'object' | 'array';

type PolicyRow = {
  policy_key: string;
  value: unknown;
  value_type: PolicyValueType;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
};

type AuditRow = {
  audit_id: number;
  policy_key: string;
  old_value: unknown;
  new_value: unknown;
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
};

type AdminConfigResponse = {
  superuser: { user_id: string; email: string };
  policies: PolicyRow[];
  audit: AuditRow[];
};

type Category = {
  id: 'models' | 'worker' | 'upload' | 'audit';
  label: string;
  icon: ReactNode;
  match: (policyKey: string) => boolean;
};

const CATEGORIES: Category[] = [
  {
    id: 'models',
    label: 'Models',
    icon: <IconBuildingFactory size={16} />,
    match: (key) => key.startsWith('models.'),
  },
  {
    id: 'worker',
    label: 'Worker',
    icon: <IconAdjustments size={16} />,
    match: (key) => key.startsWith('worker.'),
  },
  {
    id: 'upload',
    label: 'Upload',
    icon: <IconUpload size={16} />,
    match: (key) => key.startsWith('upload.'),
  },
  {
    id: 'audit',
    label: 'Audit History',
    icon: <IconHistory size={16} />,
    match: () => false,
  },
];

function formatTimestamp(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

function parseJsonTextarea(input: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(input) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Invalid JSON',
    };
  }
}

export default function SuperuserSettings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbiddenMessage, setForbiddenMessage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category['id']>('models');
  const [superuserEmail, setSuperuserEmail] = useState<string>('');
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [draftValues, setDraftValues] = useState<Record<string, unknown>>({});
  const [jsonDrafts, setJsonDrafts] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    setForbiddenMessage(null);

    try {
      const resp = await edgeFetch('admin-config?audit_limit=100', { method: 'GET' });
      const text = await resp.text();
      let payload: { error?: string } | AdminConfigResponse = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        // Keep raw text fallback below.
      }

      if (resp.status === 403 || resp.status === 503) {
        const msg = (payload as { error?: string }).error ?? text ?? 'Superuser access required.';
        setForbiddenMessage(msg);
        setLoading(false);
        return;
      }
      if (!resp.ok) {
        const msg = (payload as { error?: string }).error ?? text ?? `HTTP ${resp.status}`;
        throw new Error(msg);
      }

      const data = payload as AdminConfigResponse;
      setSuperuserEmail(data.superuser.email);
      setPolicies(data.policies);
      setAuditRows(data.audit);

      const nextDraftValues: Record<string, unknown> = {};
      const nextJsonDrafts: Record<string, string> = {};
      for (const row of data.policies) {
        nextDraftValues[row.policy_key] = row.value;
        if (row.value_type === 'object' || row.value_type === 'array') {
          nextJsonDrafts[row.policy_key] = JSON.stringify(row.value, null, 2);
        }
      }
      setDraftValues(nextDraftValues);
      setJsonDrafts(nextJsonDrafts);
      setReasons({});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredPolicies = useMemo(() => {
    const category = CATEGORIES.find((c) => c.id === selectedCategory);
    if (!category || category.id === 'audit') return [];
    return policies.filter((p) => category.match(p.policy_key));
  }, [policies, selectedCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const category of CATEGORIES) {
      if (category.id === 'audit') continue;
      counts[category.id] = policies.filter((p) => category.match(p.policy_key)).length;
    }
    return counts;
  }, [policies]);

  const savePolicy = async (row: PolicyRow) => {
    let nextValue: unknown = draftValues[row.policy_key];
    if (row.value_type === 'object' || row.value_type === 'array') {
      const parsed = parseJsonTextarea(jsonDrafts[row.policy_key] ?? '');
      if (!parsed.ok) {
        notifications.show({
          color: 'red',
          title: 'Invalid JSON',
          message: `${row.policy_key}: ${parsed.error}`,
        });
        return;
      }
      nextValue = parsed.value;
    }

    setSavingKey(row.policy_key);
    try {
      const resp = await edgeFetch('admin-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_key: row.policy_key,
          value: nextValue,
          reason: reasons[row.policy_key]?.trim() || null,
        }),
      });
      const text = await resp.text();
      const payload = text ? JSON.parse(text) : {};
      if (!resp.ok) {
        throw new Error(payload.error ?? `HTTP ${resp.status}`);
      }

      notifications.show({
        color: 'green',
        title: 'Saved',
        message: `${row.policy_key} updated.`,
      });
      await load();
    } catch (e) {
      notifications.show({
        color: 'red',
        title: 'Update failed',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Superuser Controls"
        subtitle="Centralized runtime policy controls with audit history. Changes apply to new runs only."
      />

      {error && <ErrorAlert message={error} />}
      {forbiddenMessage && (
        <ErrorAlert message={`${forbiddenMessage} Set SUPERUSER_EMAIL_ALLOWLIST to grant access.`} />
      )}
      {loading && !error && !forbiddenMessage && <Text c="dimmed">Loading superuser policies...</Text>}

      {!loading && !error && !forbiddenMessage && (
        <Group align="flex-start" gap="lg" wrap="nowrap">
          <Card withBorder radius="md" padding={0} w={260} style={{ flexShrink: 0 }}>
            <Text fw={600} size="xs" c="dimmed" tt="uppercase" px="md" pt="md" pb={4}>
              Superuser
            </Text>
            <Text size="sm" px="md" pb="sm" c="dimmed">{superuserEmail}</Text>

            {CATEGORIES.map((category) => (
              <NavLink
                key={category.id}
                label={category.label}
                py={6}
                leftSection={category.icon}
                rightSection={
                  category.id === 'audit'
                    ? <Badge size="xs">{auditRows.length}</Badge>
                    : <Badge size="xs">{categoryCounts[category.id] ?? 0}</Badge>
                }
                active={selectedCategory === category.id}
                onClick={() => setSelectedCategory(category.id)}
                styles={{
                  root: { minHeight: 40 },
                  label: { fontSize: '13px', lineHeight: 1.2 },
                }}
              />
            ))}
          </Card>

          <Box style={{ flex: 1, minWidth: 0 }}>
            {selectedCategory !== 'audit' && (
              <Stack gap="sm">
                {filteredPolicies.map((row) => (
                  <Paper key={row.policy_key} withBorder p="md" radius="md">
                    <Stack gap="xs">
                      <Group justify="space-between" align="flex-start">
                        <div>
                          <Text fw={600} size="sm">{row.policy_key}</Text>
                          <Text size="xs" c="dimmed">{row.description ?? 'No description'}</Text>
                        </div>
                        <Badge variant="light">{row.value_type}</Badge>
                      </Group>

                      {row.value_type === 'boolean' && (
                        <Switch
                          checked={Boolean(draftValues[row.policy_key])}
                          onChange={(event) => {
                            const checked = event.currentTarget.checked;
                            setDraftValues((prev) => ({ ...prev, [row.policy_key]: checked }));
                          }}
                          label="Enabled"
                        />
                      )}

                      {(row.value_type === 'integer' || row.value_type === 'number') && (
                        <NumberInput
                          value={typeof draftValues[row.policy_key] === 'number' ? (draftValues[row.policy_key] as number) : 0}
                          onChange={(value) => {
                            if (typeof value === 'number') {
                              setDraftValues((prev) => ({ ...prev, [row.policy_key]: value }));
                            }
                          }}
                          decimalScale={row.value_type === 'integer' ? 0 : 3}
                        />
                      )}

                      {row.value_type === 'string' && (
                        <TextInput
                          value={String(draftValues[row.policy_key] ?? '')}
                          onChange={(event) =>
                            setDraftValues((prev) => ({ ...prev, [row.policy_key]: event.currentTarget.value }))}
                        />
                      )}

                      {row.value_type === 'array' && (
                        <TagsInput
                          value={Array.isArray(draftValues[row.policy_key]) ? (draftValues[row.policy_key] as string[]) : []}
                          onChange={(value) => setDraftValues((prev) => ({ ...prev, [row.policy_key]: value }))}
                          placeholder="Add value and press Enter"
                        />
                      )}

                      {row.value_type === 'object' && (
                        <Textarea
                          minRows={6}
                          autosize
                          value={jsonDrafts[row.policy_key] ?? '{}'}
                          onChange={(event) =>
                            setJsonDrafts((prev) => ({ ...prev, [row.policy_key]: event.currentTarget.value }))}
                        />
                      )}

                      <TextInput
                        label="Reason (optional)"
                        placeholder="Why are you changing this?"
                        value={reasons[row.policy_key] ?? ''}
                        onChange={(event) =>
                          setReasons((prev) => ({ ...prev, [row.policy_key]: event.currentTarget.value }))}
                      />

                      <Group justify="space-between">
                        <Text size="xs" c="dimmed">
                          Updated {formatTimestamp(row.updated_at)}
                        </Text>
                        <Button
                          size="xs"
                          loading={savingKey === row.policy_key}
                          onClick={() => savePolicy(row)}
                        >
                          Save
                        </Button>
                      </Group>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}

            {selectedCategory === 'audit' && (
              <Stack gap="sm">
                {auditRows.map((row) => (
                  <Paper key={row.audit_id} withBorder p="md" radius="md">
                    <Group justify="space-between" align="flex-start">
                      <div>
                        <Text fw={600} size="sm">{row.policy_key}</Text>
                        <Text size="xs" c="dimmed">
                          {formatTimestamp(row.changed_at)}
                          {row.changed_by ? ` - ${row.changed_by}` : ''}
                        </Text>
                        {row.reason && (
                          <Text size="sm" mt={6}>{row.reason}</Text>
                        )}
                      </div>
                    </Group>
                    <Group grow align="flex-start" mt="sm">
                      <Box>
                        <Text size="xs" c="dimmed" mb={4}>Old</Text>
                        <Textarea
                          readOnly
                          autosize
                          minRows={3}
                          value={JSON.stringify(row.old_value, null, 2)}
                        />
                      </Box>
                      <Box>
                        <Text size="xs" c="dimmed" mb={4}>New</Text>
                        <Textarea
                          readOnly
                          autosize
                          minRows={3}
                          value={JSON.stringify(row.new_value, null, 2)}
                        />
                      </Box>
                    </Group>
                  </Paper>
                ))}
                {auditRows.length === 0 && (
                  <Text size="sm" c="dimmed">No audit entries yet.</Text>
                )}
              </Stack>
            )}
          </Box>
        </Group>
      )}
    </>
  );
}
