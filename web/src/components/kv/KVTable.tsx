import { useMemo, useState } from 'react';
import {
  IconCopy,
  IconEdit,
  IconEye,
  IconPlus,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import InheritedKVs from './InheritedKVs';
import { KV_MOCK_ROWS } from './kvMocks';
import type { KVRow, KVValueType } from './kvTypes';

const ALL_COLUMNS = [
  'namespace',
  'key',
  'type',
  'description',
  'value',
  'updateDate',
  'expirationDate',
] as const;

type ColumnKey = (typeof ALL_COLUMNS)[number];
type SortField = 'namespace' | 'key' | 'updateDate';
type SortDirection = 'asc' | 'desc';

type DraftKV = {
  namespace: string;
  key: string;
  type: KVValueType;
  value: string;
  description: string;
  expirationDate: string;
};

function emptyDraft(namespace = 'default'): DraftKV {
  return {
    namespace,
    key: '',
    type: 'STRING',
    value: '',
    description: '',
    expirationDate: '',
  };
}

function compareValues(left: string, right: string, direction: SortDirection): number {
  const next = left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
  return direction === 'asc' ? next : -next;
}

export default function KVTable() {
  const [rows, setRows] = useState<KVRow[]>(KV_MOCK_ROWS);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('key');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>([...ALL_COLUMNS]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<DraftKV>(emptyDraft());
  const [editTarget, setEditTarget] = useState<KVRow | null>(null);
  const [inheritedOpen, setInheritedOpen] = useState(false);

  const namespaces = useMemo(
    () => Array.from(new Set(rows.map((row) => row.namespace))).sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const scoped = rows.filter((row) => selectedNamespace === 'all' || row.namespace === selectedNamespace);
    const withSearch = needle.length === 0
      ? scoped
      : scoped.filter((row) =>
        row.key.toLowerCase().includes(needle)
        || row.namespace.toLowerCase().includes(needle)
        || row.description.toLowerCase().includes(needle)
        || row.value.toLowerCase().includes(needle),
      );

    return [...withSearch].sort((left, right) => {
      if (sortField === 'key') {
        return compareValues(left.key, right.key, sortDirection);
      }
      if (sortField === 'namespace') {
        return compareValues(left.namespace, right.namespace, sortDirection);
      }
      return compareValues(left.updateDate, right.updateDate, sortDirection);
    });
  }, [query, rows, selectedNamespace, sortDirection, sortField]);

  const selectedCount = selected.size;
  const allVisibleSelected = filteredRows.length > 0
    && filteredRows.every((row) => selected.has(`${row.namespace}:${row.key}`));

  const toggleRow = (row: KVRow) => {
    const id = `${row.namespace}:${row.key}`;
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allVisibleSelected) {
      setSelected(new Set());
      return;
    }
    const next = new Set<string>();
    filteredRows.forEach((row) => next.add(`${row.namespace}:${row.key}`));
    setSelected(next);
  };

  const toggleColumn = (column: ColumnKey) => {
    setVisibleColumns((current) => {
      if (current.includes(column)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== column);
      }
      return [...current, column];
    });
  };

  const submitDraft = () => {
    if (!draft.namespace.trim() || !draft.key.trim()) return;

    const payload: KVRow = {
      namespace: draft.namespace.trim(),
      key: draft.key.trim(),
      type: draft.type,
      value: draft.value.trim(),
      description: draft.description.trim(),
      updateDate: new Date().toISOString(),
      expirationDate: draft.expirationDate.trim() || undefined,
    };

    if (editTarget) {
      setRows((current) =>
        current.map((item) =>
          item.namespace === editTarget.namespace && item.key === editTarget.key ? payload : item,
        ));
    } else {
      setRows((current) => [payload, ...current]);
    }

    setDraft(emptyDraft(selectedNamespace === 'all' ? 'default' : selectedNamespace));
    setEditTarget(null);
  };

  const removeOne = (row: KVRow) => {
    setRows((current) => current.filter((item) => !(item.namespace === row.namespace && item.key === row.key)));
    setSelected((current) => {
      const next = new Set(current);
      next.delete(`${row.namespace}:${row.key}`);
      return next;
    });
  };

  const removeSelected = () => {
    if (selectedCount === 0) return;
    setRows((current) =>
      current.filter((item) => !selected.has(`${item.namespace}:${item.key}`)));
    setSelected(new Set());
  };

  const copyTemplate = async (row: KVRow) => {
    try {
      await navigator.clipboard.writeText(`{{ kv('${row.key}') }}`);
    } catch {
      // UI-only surface, no toast wiring here.
    }
  };

  const namespaceOptions = [{ value: 'all', label: 'All namespaces' }, ...namespaces.map((ns) => ({ value: ns, label: ns }))];

  const sortOptions = [
    { value: 'key:asc', label: 'Key (A-Z)' },
    { value: 'key:desc', label: 'Key (Z-A)' },
    { value: 'namespace:asc', label: 'Namespace (A-Z)' },
    { value: 'namespace:desc', label: 'Namespace (Z-A)' },
    { value: 'updateDate:desc', label: 'Recently updated' },
    { value: 'updateDate:asc', label: 'Least recently updated' },
  ];

  const sortValue = `${sortField}:${sortDirection}`;

  return (
    <div className="rounded-md border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <div className="relative min-w-[220px] flex-1">
          <IconSearch size={14} className="pointer-events-none absolute left-2 top-2.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search key-values"
            className="h-9 pl-7 text-sm"
          />
        </div>
        <NativeSelect
          value={selectedNamespace}
          onChange={(event) => setSelectedNamespace(event.currentTarget.value)}
          options={namespaceOptions}
          containerClassName="w-[180px]"
        />
        <NativeSelect
          value={sortValue}
          onChange={(event) => {
            const [nextField, nextDirection] = event.currentTarget.value.split(':') as [SortField, SortDirection];
            setSortField(nextField);
            setSortDirection(nextDirection);
          }}
          options={sortOptions}
          containerClassName="w-[190px]"
        />
        <DialogRoot open={inheritedOpen} onOpenChange={(details) => setInheritedOpen(details.open)}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <IconEye size={14} />
              Inherited
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] w-[980px] max-w-[calc(100vw-2rem)]">
            <DialogCloseTrigger />
            <DialogTitle>Inherited KV pairs</DialogTitle>
            <DialogDescription>
              This shows inherited values relative to the selected namespace.
            </DialogDescription>
            <DialogBody>
              <InheritedKVs namespace={selectedNamespace === 'all' ? 'default' : selectedNamespace} rows={rows} />
            </DialogBody>
          </DialogContent>
        </DialogRoot>

        <DialogRoot
          open={editTarget !== null || draft.key.length > 0 || draft.description.length > 0 || draft.value.length > 0}
          onOpenChange={(details) => {
            if (!details.open) {
              setEditTarget(null);
              setDraft(emptyDraft(selectedNamespace === 'all' ? 'default' : selectedNamespace));
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="ml-auto h-9 gap-1.5"
              onClick={() => {
                setEditTarget(null);
                setDraft(emptyDraft(selectedNamespace === 'all' ? 'default' : selectedNamespace));
              }}
            >
              <IconPlus size={14} />
              Add KV
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogCloseTrigger />
            <DialogTitle>{editTarget ? 'Update KV' : 'Add KV'}</DialogTitle>
            <DialogDescription>Design-only form surface mapped to Kestra KV fields.</DialogDescription>
            <DialogBody>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Namespace</span>
                <Input
                  value={draft.namespace}
                  onChange={(event) => setDraft((current) => ({ ...current, namespace: event.currentTarget.value }))}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Key</span>
                <Input
                  value={draft.key}
                  onChange={(event) => setDraft((current) => ({ ...current, key: event.currentTarget.value }))}
                  disabled={Boolean(editTarget)}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Type</span>
                <NativeSelect
                  value={draft.type}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, type: event.currentTarget.value as KVValueType }))}
                  options={[
                    { value: 'STRING', label: 'STRING' },
                    { value: 'NUMBER', label: 'NUMBER' },
                    { value: 'BOOLEAN', label: 'BOOLEAN' },
                    { value: 'DATETIME', label: 'DATETIME' },
                    { value: 'DATE', label: 'DATE' },
                    { value: 'DURATION', label: 'DURATION' },
                    { value: 'JSON', label: 'JSON' },
                  ]}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Value</span>
                <Input
                  value={draft.value}
                  onChange={(event) => setDraft((current) => ({ ...current, value: event.currentTarget.value }))}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Description</span>
                <Input
                  value={draft.description}
                  onChange={(event) => setDraft((current) => ({ ...current, description: event.currentTarget.value }))}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Expiration Date (optional)</span>
                <Input
                  value={draft.expirationDate}
                  onChange={(event) => setDraft((current) => ({ ...current, expirationDate: event.currentTarget.value }))}
                  placeholder="2026-08-31T00:00:00.000Z"
                />
              </label>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setEditTarget(null);
                setDraft(emptyDraft(selectedNamespace === 'all' ? 'default' : selectedNamespace));
              }}
              >
                Cancel
              </Button>
              <Button onClick={submitDraft}>{editTarget ? 'Update' : 'Save'}</Button>
            </DialogFooter>
          </DialogContent>
        </DialogRoot>
      </div>

      <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded border border-border px-2 py-1 hover:bg-accent"
            onClick={toggleAll}
          >
            {allVisibleSelected ? 'Clear selection' : 'Select visible'}
          </button>
          <span className="text-muted-foreground">
            {filteredRows.length} rows
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {ALL_COLUMNS.map((column) => {
            const active = visibleColumns.includes(column);
            return (
              <button
                key={column}
                type="button"
                className={`rounded border px-2 py-1 capitalize ${active ? 'border-primary/40 bg-primary/10 text-foreground' : 'border-border text-muted-foreground'}`}
                onClick={() => toggleColumn(column)}
              >
                {column.replace('Date', ' date')}
              </button>
            );
          })}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
            onClick={removeSelected}
            disabled={selectedCount === 0}
          >
            <IconTrash size={13} />
            Delete selected ({selectedCount})
          </Button>
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-muted/25 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-8 px-3 py-2 text-left font-medium">#</th>
              {visibleColumns.includes('namespace') ? <th className="px-3 py-2 text-left font-medium">Namespace</th> : null}
              {visibleColumns.includes('key') ? <th className="px-3 py-2 text-left font-medium">Key</th> : null}
              {visibleColumns.includes('type') ? <th className="px-3 py-2 text-left font-medium">Type</th> : null}
              {visibleColumns.includes('description') ? <th className="px-3 py-2 text-left font-medium">Description</th> : null}
              {visibleColumns.includes('value') ? <th className="px-3 py-2 text-left font-medium">Value</th> : null}
              {visibleColumns.includes('updateDate') ? <th className="px-3 py-2 text-left font-medium">Last Modified</th> : null}
              {visibleColumns.includes('expirationDate') ? <th className="px-3 py-2 text-left font-medium">Expiration</th> : null}
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => {
              const id = `${row.namespace}:${row.key}`;
              return (
                <tr key={id} className="border-t border-border/70 hover:bg-muted/20">
                  <td className="px-3 py-2 align-top">
                    <input
                      type="checkbox"
                      checked={selected.has(id)}
                      onChange={() => toggleRow(row)}
                    />
                  </td>
                  {visibleColumns.includes('namespace') ? (
                    <td className="px-3 py-2 align-top">
                      <code>{row.namespace}</code>
                    </td>
                  ) : null}
                  {visibleColumns.includes('key') ? (
                    <td className="px-3 py-2 align-top">
                      <code>{row.key}</code>
                    </td>
                  ) : null}
                  {visibleColumns.includes('type') ? (
                    <td className="px-3 py-2 align-top">
                      <span className="rounded border border-border px-1.5 py-0.5 text-[11px]">{row.type}</span>
                    </td>
                  ) : null}
                  {visibleColumns.includes('description') ? (
                    <td className="px-3 py-2 align-top text-muted-foreground">{row.description}</td>
                  ) : null}
                  {visibleColumns.includes('value') ? (
                    <td className="max-w-[380px] truncate px-3 py-2 align-top font-mono text-xs text-muted-foreground">{row.value}</td>
                  ) : null}
                  {visibleColumns.includes('updateDate') ? (
                    <td className="px-3 py-2 align-top text-muted-foreground">
                      {new Date(row.updateDate).toLocaleString()}
                    </td>
                  ) : null}
                  {visibleColumns.includes('expirationDate') ? (
                    <td className="px-3 py-2 align-top text-muted-foreground">
                      {row.expirationDate ? new Date(row.expirationDate).toLocaleDateString() : '-'}
                    </td>
                  ) : null}
                  <td className="px-3 py-2 align-top">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        aria-label={`Copy ${row.key}`}
                        onClick={() => { void copyTemplate(row); }}
                      >
                        <IconCopy size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        aria-label={`Edit ${row.key}`}
                        onClick={() => {
                          setEditTarget(row);
                          setDraft({
                            namespace: row.namespace,
                            key: row.key,
                            type: row.type,
                            value: row.value,
                            description: row.description,
                            expirationDate: row.expirationDate ?? '',
                          });
                        }}
                      >
                        <IconEdit size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                        aria-label={`Delete ${row.key}`}
                        onClick={() => removeOne(row)}
                      >
                        <IconTrash size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredRows.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">No KV pairs match this filter.</div>
        ) : null}
      </div>
    </div>
  );
}

