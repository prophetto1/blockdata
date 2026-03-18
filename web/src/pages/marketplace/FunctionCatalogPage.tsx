import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cancel01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { PageHeader } from '@/components/common/PageHeader';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MenuRoot,
  MenuTrigger,
  MenuIndicator,
  MenuPortal,
  MenuPositioner,
  MenuContent,
  MenuItem,
  MenuSeparator,
} from '@/components/ui/menu';
import { supabase } from '@/lib/supabase';

/* ── Types ── */

type FunctionRow = {
  function_name: string;
  label: string | null;
  description: string | null;
  service_name: string;
  service_id: string;
  function_type: string;
};

type SortKey = 'function_name' | 'service_name' | 'label' | 'role' | 'operation';
type SortDir = 'asc' | 'desc';
type Enriched = FunctionRow & { role: string; operation: string };

/* ── Role: where it sits in the pipeline ── */

/** Check if name starts with any of the given prefixes */
function startsWith(name: string, ...prefixes: string[]): boolean {
  return prefixes.some((p) => name.startsWith(p));
}

function inferRole(functionName: string, label: string | null): string {
  const name = functionName.split('.').pop()?.toLowerCase() ?? '';
  const lbl = (label ?? '').toLowerCase();

  // "TriggerDagRun", "TriggerRun", "TriggerWorkflow", "TriggerSavepoint" are actions, not triggers
  if (startsWith(name, 'trigger') && !name.endsWith('trigger') && name !== 'trigger')
    return 'Processor';

  // Real triggers: name IS or ENDS WITH "trigger"
  if (name.endsWith('trigger') || name === 'schedule' || name === 'scheduleondates' || name === 'webhook')
    return 'Trigger';

  // Source — pulls data in
  if (
    startsWith(name, 'find', 'get', 'list', 'query', 'queries', 'search', 'read', 'fetch',
      'consume', 'download', 'scan', 'poll', 'select', 'watch', 'discover', 'capture', 'check', 'status')
  )
    return 'Source';

  // Sink — pushes data out
  if (
    startsWith(name, 'insert', 'load', 'write', 'publish', 'produce', 'upload', 'put', 'send',
      'index', 'push', 'ingest', 'create', 'declare', 'queuebind', 'set', 'increment') ||
    lbl.includes('insert') || lbl.includes('bulk load') || lbl.includes('publish') ||
    lbl.includes('upload') || lbl.includes('create')
  )
    return 'Sink';

  return 'Processor';
}

/* ── Operation: what kind of work it does ── */

function inferOperation(functionName: string, label: string | null): string {
  const name = functionName.split('.').pop()?.toLowerCase() ?? '';
  const lbl = (label ?? '').toLowerCase();

  // Triggers always have operation = Trigger
  if (name.endsWith('trigger') || name === 'schedule' || name === 'scheduleondates' || name === 'webhook')
    return 'Trigger';

  // "TriggerDagRun" etc. are Execute, not Trigger
  if (startsWith(name, 'trigger'))
    return 'Execute';

  // CLI — command-line tool wrappers
  if (
    startsWith(name, 'commands', 'cli', 'bash', 'powershell', 'script') ||
    /plugin\.(scripts?|dbt|terraform|ansible|liquibase|malloy|argocd|jenkins|docker|kubernetes)\./i.test(functionName)
  )
    return 'CLI';

  // Read — retrieve data
  if (
    startsWith(name, 'find', 'get', 'list', 'query', 'queries', 'search', 'read', 'fetch',
      'consume', 'download', 'scan', 'poll', 'select', 'watch', 'discover', 'capture',
      'check', 'status', 'export')
  )
    return 'Read';

  // Write — create or insert new data
  if (
    startsWith(name, 'insert', 'load', 'write', 'publish', 'produce', 'upload', 'put', 'send',
      'push', 'ingest', 'create', 'declare', 'queuebind', 'set', 'index') ||
    lbl.includes('insert') || lbl.includes('bulk load') || lbl.includes('publish') ||
    lbl.includes('produce') || lbl.includes('ingest')
  )
    return 'Write';

  // Modify — change or remove existing data
  if (
    startsWith(name, 'update', 'delete', 'upsert', 'replace', 'bulk', 'batch', 'drop',
      'truncate', 'remove', 'purge', 'increment', 'toggle') ||
    lbl.includes('delete') || lbl.includes('update') || lbl.includes('bulk request')
  )
    return 'Modify';

  // Transfer — move data between locations
  if (startsWith(name, 'copy', 'move', 'sync', 'rename'))
    return 'Transfer';

  // Transform — reshape, convert, or compute data
  if (
    startsWith(name, 'aggregate', 'transform', 'convert', 'compose', 'chat', 'text',
      'multimodal', 'classification', 'image', 'json') ||
    lbl.includes('aggregat') || lbl.includes('transform') || lbl.includes('convert') ||
    lbl.includes('classify') || lbl.includes('completion')
  )
    return 'Transform';

  // Execute — run code or invoke external systems
  if (
    startsWith(name, 'run', 'eval', 'build', 'execute', 'request', 'resume') ||
    lbl.includes('execute') || lbl.includes('run ')
  )
    return 'Execute';

  // Notify — send alerts or messages
  if (lbl.includes('send message') || lbl.includes('send notification') || lbl.includes('post message') || lbl.includes('alert'))
    return 'Notify';

  // Control — manage infrastructure or orchestrate
  if (startsWith(name, 'schedule', 'oauth', 'reset') || lbl.includes('config'))
    return 'Control';

  return 'Execute';
}

/* ── Colors ── */

const ROLE_COLORS: Record<string, string> = {
  Source: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  Processor: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  Sink: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  Trigger: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

const OP_COLORS: Record<string, string> = {
  Read: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
  Write: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  Modify: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
  Transform: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  Transfer: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  Execute: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  CLI: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200',
  Notify: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  Control: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
  Trigger: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

const ROLES = ['Source', 'Processor', 'Sink'] as const;
const OPS = ['Read', 'Write', 'Modify', 'Transform', 'Transfer', 'Execute', 'CLI', 'Notify', 'Control'] as const;

/* ── Component ── */

export default function FunctionCatalogPage() {
  const [rows, setRows] = useState<FunctionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('function_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [opFilter, setOpFilter] = useState<string>('all');
  const [showTriggers, setShowTriggers] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('service_functions')
        .select('function_name, label, description, function_type, service_id, service:service_registry!inner(service_name)')
        .order('function_name');

      if (error) {
        console.error('Failed to load functions:', error);
        setLoading(false);
        return;
      }

      const mapped: FunctionRow[] = (data ?? []).map((row: any) => ({
        function_name: row.function_name,
        label: row.label,
        description: row.description,
        service_name: row.service?.service_name ?? '—',
        service_id: row.service_id,
        function_type: row.function_type,
      }));

      setRows(mapped);
      setLoading(false);
    })();
  }, []);

  const allEnriched: Enriched[] = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        role: inferRole(r.function_name, r.label),
        operation: inferOperation(r.function_name, r.label),
      })),
    [rows],
  );

  const triggers = useMemo(() => allEnriched.filter((r) => r.role === 'Trigger'), [allEnriched]);
  const functions = useMemo(() => allEnriched.filter((r) => r.role !== 'Trigger'), [allEnriched]);
  const enriched = showTriggers ? triggers : functions;

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of functions) counts[r.role] = (counts[r.role] ?? 0) + 1;
    return counts;
  }, [functions]);

  const opCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of functions) counts[r.operation] = (counts[r.operation] ?? 0) + 1;
    return counts;
  }, [functions]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = enriched;

    if (q) {
      result = result.filter(
        (r) =>
          r.function_name.toLowerCase().includes(q) ||
          (r.label ?? '').toLowerCase().includes(q) ||
          (r.description ?? '').toLowerCase().includes(q) ||
          r.service_name.toLowerCase().includes(q),
      );
    }

    if (roleFilter !== 'all') result = result.filter((r) => r.role === roleFilter);
    if (opFilter !== 'all') result = result.filter((r) => r.operation === opFilter);

    result.sort((a, b) => {
      let aVal: string, bVal: string;
      if (sortKey === 'role') { aVal = a.role; bVal = b.role; }
      else if (sortKey === 'operation') { aVal = a.operation; bVal = b.operation; }
      else { aVal = (a[sortKey] ?? '').toLowerCase(); bVal = (b[sortKey] ?? '').toLowerCase(); }
      const cmp = aVal.localeCompare(bVal);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [enriched, search, sortKey, sortDir, roleFilter, opFilter]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' \u2191' : ' \u2193';
  };

  const hasFilters = roleFilter !== 'all' || opFilter !== 'all' || search.trim() !== '';

  const thClass =
    'px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors whitespace-nowrap';

  const roleLabel = roleFilter === 'all' ? 'Role' : roleFilter;
  const opLabel = opFilter === 'all' ? 'Operation' : opFilter;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Function Catalog"
        subtitle={showTriggers
          ? `${triggers.length} triggers across ${new Set(triggers.map((r) => r.service_name)).size} services`
          : `${functions.length} functions across ${new Set(functions.map((r) => r.service_name)).size} services`
        }
      />

      <div className="min-h-0 flex-1 px-4 pb-4">
        <div className="flex min-h-0 flex-1 h-full flex-col rounded-md border border-border bg-card">

          {/* ── Toolbar ── */}
          <div className="shrink-0 border-b border-border px-3 py-2.5">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-[400px]">
                <HugeiconsIcon
                  icon={Search01Icon}
                  size={16}
                  strokeWidth={1.8}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search functions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full py-1.5 pl-9 pr-8 border border-border rounded-md bg-background text-foreground text-sm outline-none transition-colors focus:border-primary"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none text-muted-foreground text-lg cursor-pointer leading-none px-1"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={1.8} />
                  </button>
                )}
              </div>

              {/* Role & Operation filter dropdowns */}
              {!showTriggers && (<>
              <MenuRoot>
                <MenuTrigger
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    roleFilter !== 'all'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-foreground hover:bg-accent'
                  }`}
                >
                  {roleLabel}
                  <MenuIndicator />
                </MenuTrigger>
                <MenuPortal>
                  <MenuPositioner>
                    <MenuContent>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Pipeline Role</div>
                      <MenuItem
                        value="all"
                        onClick={() => setRoleFilter('all')}
                        className={roleFilter === 'all' ? 'font-semibold' : ''}
                      >
                        All ({enriched.length})
                      </MenuItem>
                      <MenuSeparator />
                      {ROLES.map((r) => (
                        <MenuItem
                          key={r}
                          value={r}
                          onClick={() => setRoleFilter(roleFilter === r ? 'all' : r)}
                          className={roleFilter === r ? 'font-semibold' : ''}
                        >
                          <span className="flex items-center gap-2">
                            <span className={`inline-block w-2 h-2 rounded-full ${ROLE_COLORS[r].split(' ').slice(0, 1).join(' ')}`} />
                            {r}
                            <span className="text-muted-foreground ml-auto">{roleCounts[r] ?? 0}</span>
                          </span>
                        </MenuItem>
                      ))}
                    </MenuContent>
                  </MenuPositioner>
                </MenuPortal>
              </MenuRoot>

              {/* Operation filter dropdown */}
              <MenuRoot>
                <MenuTrigger
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    opFilter !== 'all'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-foreground hover:bg-accent'
                  }`}
                >
                  {opLabel}
                  <MenuIndicator />
                </MenuTrigger>
                <MenuPortal>
                  <MenuPositioner>
                    <MenuContent>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Operation Type</div>
                      <MenuItem
                        value="all"
                        onClick={() => setOpFilter('all')}
                        className={opFilter === 'all' ? 'font-semibold' : ''}
                      >
                        All ({enriched.length})
                      </MenuItem>
                      <MenuSeparator />
                      {OPS.map((op) =>
                        (opCounts[op] ?? 0) > 0 ? (
                          <MenuItem
                            key={op}
                            value={op}
                            onClick={() => setOpFilter(opFilter === op ? 'all' : op)}
                            className={opFilter === op ? 'font-semibold' : ''}
                          >
                            <span className="flex items-center gap-2">
                              <span className={`inline-block w-2 h-2 rounded-full ${OP_COLORS[op].split(' ').slice(0, 1).join(' ')}`} />
                              {op}
                              <span className="text-muted-foreground ml-auto">{opCounts[op]}</span>
                            </span>
                          </MenuItem>
                        ) : null,
                      )}
                    </MenuContent>
                  </MenuPositioner>
                </MenuPortal>
              </MenuRoot>
              </>)}

              {/* Clear filters */}
              {hasFilters && !showTriggers && (
                <button
                  type="button"
                  onClick={() => { setRoleFilter('all'); setOpFilter('all'); setSearch(''); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear all
                </button>
              )}

              {/* View Triggers / View Functions toggle */}
              <button
                type="button"
                onClick={() => { setShowTriggers(!showTriggers); setRoleFilter('all'); setOpFilter('all'); setSearch(''); }}
                className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  showTriggers
                    ? 'border-purple-400 bg-purple-100 text-purple-800 dark:border-purple-600 dark:bg-purple-900 dark:text-purple-200'
                    : 'border-border bg-background text-foreground hover:bg-accent'
                }`}
              >
                {showTriggers ? `View Functions (${functions.length})` : `View Triggers (${triggers.length})`}
              </button>

              {/* Count + link */}
              <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
                {filtered.length} of {enriched.length}
              </span>
              <Link
                to="/app/marketplace/services"
                className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground no-underline transition-colors hover:border-primary hover:text-primary shrink-0"
              >
                Services Catalog
              </Link>
            </div>
          </div>

          {/* ── Table ── */}
          <ScrollArea className="min-h-0 flex-1" viewportClass="h-full overflow-y-auto overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-muted-foreground italic py-12 px-4">
                No functions match your filters.
              </p>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-card z-10 border-b border-border">
                  <tr>
                    <th className={`${thClass} cursor-default w-10`}>#</th>
                    <th className={thClass} onClick={() => toggleSort('function_name')}>
                      Function{sortIndicator('function_name')}
                    </th>
                    <th className={thClass} onClick={() => toggleSort('service_name')}>
                      Service{sortIndicator('service_name')}
                    </th>
                    {!showTriggers && (
                      <th className={thClass} onClick={() => toggleSort('role')}>
                        Role{sortIndicator('role')}
                      </th>
                    )}
                    {!showTriggers && (
                      <th className={thClass} onClick={() => toggleSort('operation')}>
                        Operation{sortIndicator('operation')}
                      </th>
                    )}
                    <th className={thClass} onClick={() => toggleSort('label')}>
                      Description{sortIndicator('label')}
                    </th>
                    <th className={`${thClass} cursor-default`}> </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((r, i) => (
                    <tr
                      key={r.function_name}
                      className="hover:bg-accent/50 transition-colors"
                    >
                      <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums text-right w-10">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-foreground whitespace-nowrap">
                        {r.function_name}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {r.service_name}
                      </td>
                      {!showTriggers && (
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium ${ROLE_COLORS[r.role]}`}>
                            {r.role}
                          </span>
                        </td>
                      )}
                      {!showTriggers && (
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium ${OP_COLORS[r.operation]}`}>
                            {r.operation}
                          </span>
                        </td>
                      )}
                      <td className="px-3 py-2 text-xs text-foreground max-w-lg">
                        <div className="line-clamp-1 font-medium">
                          {r.label ?? '—'}
                        </div>
                        {r.description && (
                          <div className="line-clamp-2 text-muted-foreground mt-0.5">
                            {r.description}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Link
                          to={`/app/marketplace/services/${r.service_id}?fn=${encodeURIComponent(r.function_name)}`}
                          className="text-xs font-medium text-primary no-underline hover:underline"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
