import { Field } from '@ark-ui/react/field';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SelectRoot, SelectControl, SelectTrigger, SelectValueText, SelectContent, SelectItem, SelectItemText, createListCollection } from '@/components/ui/select';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { cn } from '@/lib/utils';
import { edgeFetch } from '@/lib/edge';

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
  blockdata_admin: { user_id: string; email: string };
  audit: AuditRow[];
};

type AuditTimeRange = '24h' | '7d' | '30d' | 'all';

const inputClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

function formatTimestamp(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

function stringifyValue(value: unknown): string {
  const serialized = JSON.stringify(value, null, 2);
  return serialized ?? 'null';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function summarizePreviewValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value.length > 28 ? `${value.slice(0, 28)}...` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === 'object') return '{...}';
  return String(value);
}

function summarizeAuditChange(row: AuditRow): string {
  const oldRecord = asRecord(row.old_value);
  const newRecord = asRecord(row.new_value);

  if (oldRecord && newRecord) {
    const keys = Array.from(new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)]));
    const changedKeys = keys.filter((key) => JSON.stringify(oldRecord[key]) !== JSON.stringify(newRecord[key]));
    if (changedKeys.length === 0) return 'No value delta';

    const key = changedKeys[0];
    if (!key) return 'No value delta';
    const oldPreview = summarizePreviewValue(oldRecord[key]);
    const newPreview = summarizePreviewValue(newRecord[key]);
    const extraCount = changedKeys.length - 1;
    return extraCount > 0
      ? `${key}: ${oldPreview} -> ${newPreview} (+${extraCount} more)`
      : `${key}: ${oldPreview} -> ${newPreview}`;
  }

  const oldPreview = summarizePreviewValue(row.old_value);
  const newPreview = summarizePreviewValue(row.new_value);
  if (oldPreview === newPreview) return 'No value delta';
  return `${oldPreview} -> ${newPreview}`;
}

function isAuditRowInRange(changedAt: string, range: AuditTimeRange): boolean {
  if (range === 'all') return true;
  const timestamp = new Date(changedAt).getTime();
  if (Number.isNaN(timestamp)) return true;
  const now = Date.now();
  const rangeMs = range === '24h'
    ? 24 * 60 * 60 * 1000
    : range === '7d'
      ? 7 * 24 * 60 * 60 * 1000
      : 30 * 24 * 60 * 60 * 1000;
  return now - timestamp <= rangeMs;
}

export function Component() {
  useShellHeaderTitle({ title: 'Audit History', breadcrumbs: ['Blockdata Admin', 'Audit History'] });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActorFilter, setAuditActorFilter] = useState<string>('all');
  const [auditRangeFilter, setAuditRangeFilter] = useState<AuditTimeRange>('7d');
  const [selectedAuditId, setSelectedAuditId] = useState<number | null>(null);

  const auditActorOptions = useMemo(() => {
    const actors = Array.from(new Set(
      auditRows
        .map((row) => row.changed_by?.trim() ?? '')
        .filter((value) => value.length > 0),
    )).sort((a, b) => a.localeCompare(b));
    return ['all', ...actors];
  }, [auditRows]);

  const filteredAuditRows = useMemo(() => {
    const query = auditSearch.trim().toLowerCase();
    return auditRows.filter((row) => {
      if (!isAuditRowInRange(row.changed_at, auditRangeFilter)) return false;
      if (auditActorFilter !== 'all' && (row.changed_by ?? '') !== auditActorFilter) return false;
      if (!query) return true;

      const haystack = [
        row.policy_key,
        row.changed_by ?? '',
        row.reason ?? '',
        summarizeAuditChange(row),
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [auditActorFilter, auditRangeFilter, auditRows, auditSearch]);

  const selectedAuditRow = useMemo(() => {
    if (filteredAuditRows.length === 0) return null;
    if (selectedAuditId !== null) {
      const found = filteredAuditRows.find((row) => row.audit_id === selectedAuditId);
      if (found) return found;
    }
    return filteredAuditRows[0] ?? null;
  }, [filteredAuditRows, selectedAuditId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await edgeFetch('admin-config?audit_limit=100', { method: 'GET' });
        const text = await resp.text();
        let payload: { error?: string } | AdminConfigResponse = {};
        try {
          payload = text ? JSON.parse(text) : {};
        } catch {
          // Keep raw text fallback below.
        }

        if (!resp.ok) {
          throw new Error(typeof payload === 'object' && payload && 'error' in payload ? payload.error ?? 'Failed to load audit history' : 'Failed to load audit history');
        }

        const data = payload as AdminConfigResponse;
        setAuditRows(Array.isArray(data.audit) ? data.audit : []);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : String(nextError));
        setAuditRows([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <div className="min-w-0 h-full overflow-hidden">
        {error && <ErrorAlert message={error} />}
        {loading && !error && (
          <p className="p-4 text-sm text-muted-foreground">Loading audit history...</p>
        )}

        {!loading && !error && (
          <ScrollArea className="h-full" contentClass="p-3 md:p-4">
            <div className="space-y-4">
              <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_220px_130px_auto]">
                <Field.Root>
                  <Field.Input
                    className={inputClass}
                    value={auditSearch}
                    onChange={(event) => setAuditSearch(event.currentTarget.value)}
                    placeholder="Search policy, actor, reason, change"
                  />
                </Field.Root>
                <SelectRoot
                  collection={createListCollection({
                    items: auditActorOptions.map((actor) => ({
                      label: actor === 'all' ? 'All actors' : actor,
                      value: actor,
                    })),
                  })}
                  value={[auditActorFilter]}
                  onValueChange={(details) => {
                    const val = details.value[0];
                    if (val) setAuditActorFilter(val);
                  }}
                >
                  <SelectControl>
                    <SelectTrigger className={inputClass}>
                      <SelectValueText />
                    </SelectTrigger>
                  </SelectControl>
                  <SelectContent>
                    {auditActorOptions.map((actor) => (
                      <SelectItem key={actor} item={{ label: actor === 'all' ? 'All actors' : actor, value: actor }}>
                        <SelectItemText>{actor === 'all' ? 'All actors' : actor}</SelectItemText>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </SelectRoot>
                <SelectRoot
                  collection={createListCollection({
                    items: [
                      { label: 'Last 24h', value: '24h' },
                      { label: 'Last 7d', value: '7d' },
                      { label: 'Last 30d', value: '30d' },
                      { label: 'All time', value: 'all' },
                    ],
                  })}
                  value={[auditRangeFilter]}
                  onValueChange={(details) => {
                    const val = details.value[0];
                    if (val) setAuditRangeFilter(val as AuditTimeRange);
                  }}
                >
                  <SelectControl>
                    <SelectTrigger className={inputClass}>
                      <SelectValueText />
                    </SelectTrigger>
                  </SelectControl>
                  <SelectContent>
                    <SelectItem item={{ label: 'Last 24h', value: '24h' }}><SelectItemText>Last 24h</SelectItemText></SelectItem>
                    <SelectItem item={{ label: 'Last 7d', value: '7d' }}><SelectItemText>Last 7d</SelectItemText></SelectItem>
                    <SelectItem item={{ label: 'Last 30d', value: '30d' }}><SelectItemText>Last 30d</SelectItemText></SelectItem>
                    <SelectItem item={{ label: 'All time', value: 'all' }}><SelectItemText>All time</SelectItemText></SelectItem>
                  </SelectContent>
                </SelectRoot>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAuditSearch('');
                    setAuditActorFilter('all');
                    setAuditRangeFilter('7d');
                  }}
                >
                  Reset filters
                </Button>
              </div>

              <ScrollArea className="rounded-md border border-border">
                <table className="min-w-full border-collapse text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">When</th>
                      <th className="px-3 py-2 font-medium">Policy</th>
                      <th className="px-3 py-2 font-medium">Actor</th>
                      <th className="px-3 py-2 font-medium">Reason</th>
                      <th className="px-3 py-2 font-medium">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAuditRows.map((row) => {
                      const selected = selectedAuditRow?.audit_id === row.audit_id;
                      return (
                        <tr
                          key={row.audit_id}
                          className={cn(
                            'cursor-pointer border-t border-border align-top hover:bg-accent/40',
                            selected && 'bg-accent/55',
                          )}
                          onClick={() => setSelectedAuditId(row.audit_id)}
                        >
                          <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                            {formatTimestamp(row.changed_at)}
                          </td>
                          <td className="px-3 py-2 font-medium text-foreground">{row.policy_key}</td>
                          <td className="px-3 py-2 text-muted-foreground">{row.changed_by ?? 'system'}</td>
                          <td className="max-w-[320px] truncate px-3 py-2 text-muted-foreground" title={row.reason ?? ''}>
                            {row.reason?.trim() || '-'}
                          </td>
                          <td className="max-w-[420px] truncate px-3 py-2 text-foreground" title={summarizeAuditChange(row)}>
                            {summarizeAuditChange(row)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollArea>

              {filteredAuditRows.length === 0 && (
                <p className="text-sm text-muted-foreground">No audit entries match current filters.</p>
              )}

              {selectedAuditRow && (
                <article className="rounded-lg border border-border bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{selectedAuditRow.policy_key}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatTimestamp(selectedAuditRow.changed_at)}
                        {' | '}
                        {selectedAuditRow.changed_by ?? 'system'}
                        {' | '}
                        audit_id={selectedAuditRow.audit_id}
                      </p>
                    </div>
                    <span className="rounded-md border border-border bg-muted px-2 py-1 text-xs text-foreground">
                      {summarizeAuditChange(selectedAuditRow)}
                    </span>
                  </div>

                  {selectedAuditRow.reason?.trim() && (
                    <p className="mt-3 text-sm text-foreground">{selectedAuditRow.reason}</p>
                  )}

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">Old</p>
                      <textarea
                        readOnly
                        rows={14}
                        className="w-full rounded-md border border-input bg-background p-2 font-mono text-xs text-foreground"
                        value={stringifyValue(selectedAuditRow.old_value)}
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">New</p>
                      <textarea
                        readOnly
                        rows={14}
                        className="w-full rounded-md border border-input bg-background p-2 font-mono text-xs text-foreground"
                        value={stringifyValue(selectedAuditRow.new_value)}
                      />
                    </div>
                  </div>
                </article>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
