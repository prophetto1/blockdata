import { Field } from '@ark-ui/react/field';
import { NumberInput } from '@ark-ui/react/number-input';
import { Switch } from '@ark-ui/react/switch';
import { TagsInput } from '@ark-ui/react/tags-input';
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { cn } from '@/lib/utils';
import { edgeFetch } from '@/lib/edge';

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

const CATEGORY_IDS = ['models', 'worker', 'upload', 'audit'] as const;
type CategoryId = (typeof CATEGORY_IDS)[number];

type Category = {
  id: CategoryId;
  label: string;
  match: (policyKey: string) => boolean;
};

type InlineStatus = {
  kind: 'success' | 'error';
  message: string;
};

const CATEGORIES: Category[] = [
  {
    id: 'models',
    label: 'Models',
    match: (key) => key.startsWith('models.'),
  },
  {
    id: 'worker',
    label: 'Worker',
    match: (key) => key.startsWith('worker.'),
  },
  {
    id: 'upload',
    label: 'Upload',
    match: (key) => key.startsWith('upload.'),
  },
  {
    id: 'audit',
    label: 'Audit History',
    match: () => false,
  },
];

function toCategoryId(value: string | undefined): CategoryId | null {
  if (!value) return null;
  return CATEGORY_IDS.includes(value as CategoryId) ? (value as CategoryId) : null;
}

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

function stringifyValue(value: unknown): string {
  const serialized = JSON.stringify(value, null, 2);
  return serialized ?? 'null';
}

const inputClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export default function SettingsAdmin() {
  const { category } = useParams<{ category?: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbiddenMessage, setForbiddenMessage] = useState<string | null>(null);
  const [superuserEmail, setSuperuserEmail] = useState<string>('');
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [draftValues, setDraftValues] = useState<Record<string, unknown>>({});
  const [jsonDrafts, setJsonDrafts] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [status, setStatus] = useState<InlineStatus | null>(null);

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
          nextJsonDrafts[row.policy_key] = stringifyValue(row.value);
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

  const selectedCategory = useMemo(() => toCategoryId(category), [category]);

  const selectedCategoryDef = useMemo(() => {
    if (!selectedCategory) return null;
    return CATEGORIES.find((c) => c.id === selectedCategory) ?? null;
  }, [selectedCategory]);

  const filteredPolicies = useMemo(() => {
    if (!selectedCategoryDef || selectedCategoryDef.id === 'audit') return [];
    return policies.filter((p) => selectedCategoryDef.match(p.policy_key));
  }, [policies, selectedCategoryDef]);

  const savePolicy = async (row: PolicyRow) => {
    setStatus(null);
    let nextValue: unknown = draftValues[row.policy_key];
    if (row.value_type === 'object' || row.value_type === 'array') {
      const parsed = parseJsonTextarea(jsonDrafts[row.policy_key] ?? '');
      if (!parsed.ok) {
        setStatus({
          kind: 'error',
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
      let payload: { error?: string } = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        // Keep raw text fallback below.
      }
      if (!resp.ok) {
        throw new Error(payload.error ?? text ?? `HTTP ${resp.status}`);
      }

      await load();
      setStatus({
        kind: 'success',
        message: `${row.policy_key} updated.`,
      });
    } catch (e) {
      setStatus({
        kind: 'error',
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSavingKey(null);
    }
  };

  if (!selectedCategory) {
    return <Navigate to="/app/settings/admin/models" replace />;
  }

  return (
    <>
      {status && (
        <div
          className={cn(
            'mb-4 rounded-md border px-3 py-2 text-sm',
            status.kind === 'success'
              ? 'border-green-600/30 bg-green-600/10 text-green-600'
              : 'border-red-600/30 bg-red-600/10 text-red-600',
          )}
          role="status"
          aria-live="polite"
        >
          {status.message}
        </div>
      )}

      {error && <ErrorAlert message={error} />}
      {forbiddenMessage && (
        <ErrorAlert message={`${forbiddenMessage} Set SUPERUSER_EMAIL_ALLOWLIST to grant access.`} />
      )}
      {loading && !error && !forbiddenMessage && (
        <p className="text-sm text-muted-foreground">Loading superuser policies...</p>
      )}

      {!loading && !error && !forbiddenMessage && selectedCategoryDef && (
        <section className="min-w-0 space-y-4">
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Superuser
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-foreground">{selectedCategoryDef.label}</h2>
              <p className="text-sm text-muted-foreground">{superuserEmail}</p>
            </div>
          </div>

            {selectedCategory !== 'audit' && (
              <div className="space-y-3">
                {filteredPolicies.map((row) => {
                  const numericDraft = typeof draftValues[row.policy_key] === 'number'
                    ? (draftValues[row.policy_key] as number)
                    : 0;
                  const tagDraft = Array.isArray(draftValues[row.policy_key])
                    ? (draftValues[row.policy_key] as unknown[]).map((item) => String(item))
                    : [];
                  return (
                    <article key={row.policy_key} className="rounded-lg border border-border bg-card p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">{row.policy_key}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">{row.description ?? 'No description'}</p>
                        </div>
                        <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {row.value_type}
                        </span>
                      </div>

                      <div className="mt-3 space-y-3">
                        {row.value_type === 'boolean' && (
                          <Switch.Root
                            checked={Boolean(draftValues[row.policy_key])}
                            onCheckedChange={(details) => {
                              setDraftValues((prev) => ({ ...prev, [row.policy_key]: details.checked }));
                            }}
                            className="inline-flex items-center gap-2"
                          >
                            <Switch.HiddenInput />
                            <Switch.Control className="relative h-6 w-11 rounded-full border border-input bg-muted transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary">
                              <Switch.Thumb className="block h-5 w-5 translate-x-0 rounded-full bg-background shadow transition-transform data-[state=checked]:translate-x-5" />
                            </Switch.Control>
                            <Switch.Label className="text-sm text-foreground">Enabled</Switch.Label>
                          </Switch.Root>
                        )}

                        {(row.value_type === 'integer' || row.value_type === 'number') && (
                          <NumberInput.Root
                            value={String(numericDraft)}
                            min={Number.MIN_SAFE_INTEGER}
                            max={Number.MAX_SAFE_INTEGER}
                            step={row.value_type === 'integer' ? 1 : 0.001}
                            formatOptions={row.value_type === 'integer'
                              ? { maximumFractionDigits: 0 }
                              : { maximumFractionDigits: 3 }}
                            onValueChange={(details) => {
                              if (Number.isFinite(details.valueAsNumber)) {
                                const next = row.value_type === 'integer'
                                  ? Math.trunc(details.valueAsNumber)
                                  : details.valueAsNumber;
                                setDraftValues((prev) => ({ ...prev, [row.policy_key]: next }));
                              }
                            }}
                            className="w-full"
                          >
                            <NumberInput.Control className="relative">
                              <NumberInput.Input className={`${inputClass} pr-16`} />
                              <div className="absolute inset-y-0 right-1 flex items-center gap-1">
                                <NumberInput.DecrementTrigger className="h-8 w-6 rounded border border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                                  -
                                </NumberInput.DecrementTrigger>
                                <NumberInput.IncrementTrigger className="h-8 w-6 rounded border border-input text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                                  +
                                </NumberInput.IncrementTrigger>
                              </div>
                            </NumberInput.Control>
                          </NumberInput.Root>
                        )}

                        {row.value_type === 'string' && (
                          <Field.Root>
                            <Field.Input
                              className={inputClass}
                              value={String(draftValues[row.policy_key] ?? '')}
                              onChange={(event) =>
                                setDraftValues((prev) => ({ ...prev, [row.policy_key]: event.currentTarget.value }))}
                            />
                          </Field.Root>
                        )}

                        {row.value_type === 'array' && (
                          <TagsInput.Root
                            value={tagDraft}
                            onValueChange={(details) => setDraftValues((prev) => ({ ...prev, [row.policy_key]: details.value }))}
                            addOnPaste
                            blurBehavior="add"
                            className="w-full"
                          >
                            <TagsInput.Control className="flex min-h-10 w-full flex-wrap items-center gap-2 rounded-md border border-input bg-background px-2 py-1 focus-within:ring-1 focus-within:ring-ring">
                              {tagDraft.map((item, index) => (
                                <TagsInput.Item
                                  key={`${row.policy_key}-${index}-${item}`}
                                  index={index}
                                  value={item}
                                  className="rounded-md bg-muted px-2 py-1 text-xs text-foreground"
                                >
                                  <TagsInput.ItemPreview className="inline-flex items-center gap-1">
                                    <TagsInput.ItemText />
                                    <TagsInput.ItemDeleteTrigger className="text-muted-foreground hover:text-foreground">
                                      x
                                    </TagsInput.ItemDeleteTrigger>
                                  </TagsInput.ItemPreview>
                                  <TagsInput.ItemInput className="rounded border border-input bg-background px-1 text-xs text-foreground focus:outline-none" />
                                </TagsInput.Item>
                              ))}
                              <TagsInput.Input
                                className="h-8 min-w-[120px] flex-1 border-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                                placeholder="Add value and press Enter"
                              />
                            </TagsInput.Control>
                          </TagsInput.Root>
                        )}

                        {row.value_type === 'object' && (
                          <Field.Root>
                            <Field.Textarea
                              className="min-h-36 w-full rounded-md border border-input bg-background p-3 font-mono text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              value={jsonDrafts[row.policy_key] ?? '{}'}
                              onChange={(event) =>
                                setJsonDrafts((prev) => ({ ...prev, [row.policy_key]: event.currentTarget.value }))}
                            />
                          </Field.Root>
                        )}

                        <Field.Root>
                          <Field.Label className="mb-1 block text-xs font-medium text-muted-foreground">Reason (optional)</Field.Label>
                          <Field.Input
                            className={inputClass}
                            placeholder="Why are you changing this?"
                            value={reasons[row.policy_key] ?? ''}
                            onChange={(event) =>
                              setReasons((prev) => ({ ...prev, [row.policy_key]: event.currentTarget.value }))}
                          />
                        </Field.Root>

                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground">
                            Updated {formatTimestamp(row.updated_at)}
                          </p>
                          <Button
                            size="sm"
                            className="h-8 px-3 text-xs"
                            disabled={savingKey === row.policy_key}
                            onClick={() => savePolicy(row)}
                          >
                            {savingKey === row.policy_key ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
                {filteredPolicies.length === 0 && (
                  <p className="text-sm text-muted-foreground">No policies in this category.</p>
                )}
              </div>
            )}

            {selectedCategory === 'audit' && (
              <div className="space-y-3">
                {auditRows.map((row) => (
                  <article key={row.audit_id} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{row.policy_key}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatTimestamp(row.changed_at)}
                          {row.changed_by ? ` - ${row.changed_by}` : ''}
                        </p>
                        {row.reason && (
                          <p className="mt-2 text-sm text-foreground">{row.reason}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Old</p>
                        <textarea
                          readOnly
                          rows={3}
                          className="w-full rounded-md border border-input bg-background p-2 font-mono text-xs text-foreground"
                          value={stringifyValue(row.old_value)}
                        />
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">New</p>
                        <textarea
                          readOnly
                          rows={3}
                          className="w-full rounded-md border border-input bg-background p-2 font-mono text-xs text-foreground"
                          value={stringifyValue(row.new_value)}
                        />
                      </div>
                    </div>
                  </article>
                ))}
                {auditRows.length === 0 && (
                  <p className="text-sm text-muted-foreground">No audit entries yet.</p>
                )}
              </div>
            )}
        </section>
      )}
    </>
  );
}
