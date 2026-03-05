import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  IconArrowLeft, IconChevronDown, IconChevronRight, IconCopy, IconCheck,
  IconExternalLink, IconLayoutCards, IconFileDescription,
} from '@tabler/icons-react';
import { Clipboard } from '@ark-ui/react/clipboard';
import { JsonTreeView } from '@ark-ui/react/json-tree-view';
import { PageHeader } from '@/components/common/PageHeader';
import { supabase } from '@/lib/supabase';
import type { ServiceFunctionRow, ServiceRow, ParamDef } from '@/pages/settings/services-panel.types';
import { formatTimestamp } from '@/pages/settings/services-panel.types';

/* ------------------------------------------------------------------ */
/*  Shared visual helpers (same as ServicesCatalog)                    */
/* ------------------------------------------------------------------ */

function iconColor(name: string): string {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EB5E41',
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#EF4444',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return colors[Math.abs(hash) % colors.length]!;
}

const HEALTH_COLORS: Record<string, string> = {
  online: '#10B981',
  healthy: '#10B981',
  degraded: '#F59E0B',
  offline: '#EF4444',
  unknown: '#6B7280',
};

/* ------------------------------------------------------------------ */
/*  Pill                                                               */
/* ------------------------------------------------------------------ */

function Pill({ children, variant = 'muted' }: { children: React.ReactNode; variant?: 'primary' | 'muted' | 'red' | 'amber' }) {
  const cls =
    variant === 'primary' ? 'bg-primary/10 text-primary' :
    variant === 'red' ? 'bg-red-500/10 text-red-400' :
    variant === 'amber' ? 'bg-amber-500/10 text-amber-400' :
    'bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium ${cls}`}>
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  CopyButton                                                         */
/* ------------------------------------------------------------------ */

function CopyButton({ value, label }: { value: string; label?: string }) {
  return (
    <Clipboard.Root value={value}>
      <Clipboard.Trigger
        className="inline-flex items-center gap-1 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
        title={label ?? 'Copy'}
      >
        <Clipboard.Indicator copied={<IconCheck size={12} className="text-primary" />}>
          <IconCopy size={12} />
        </Clipboard.Indicator>
      </Clipboard.Trigger>
    </Clipboard.Root>
  );
}

/* ------------------------------------------------------------------ */
/*  Section label                                                      */
/* ------------------------------------------------------------------ */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  JSON tree block (interactive, with copy)                           */
/* ------------------------------------------------------------------ */

const jsonTreeRoot = [
  'w-full font-mono text-foreground',
  '[&_[data-part=branch-content]]:relative',
  '[&_[data-part=branch-indent-guide]]:absolute [&_[data-part=branch-indent-guide]]:h-full [&_[data-part=branch-indent-guide]]:w-px [&_[data-part=branch-indent-guide]]:bg-border/40',
  '[&_[data-part=branch-control]]:flex [&_[data-part=branch-control]]:select-none [&_[data-part=branch-control]]:rounded [&_[data-part=branch-control]]:hover:bg-white/5',
  '[&_[data-part=branch-indicator]]:inline-flex [&_[data-part=branch-indicator]]:items-center [&_[data-part=branch-indicator]]:mr-1 [&_[data-part=branch-indicator]]:origin-center',
  '[&_[data-part=branch-indicator][data-state=open]]:rotate-90',
  '[&_[data-part=item]]:flex [&_[data-part=item]]:relative [&_[data-part=item]]:rounded [&_[data-part=item]]:hover:bg-white/5',
  '[&_[data-part=item-text]]:flex [&_[data-part=item-text]]:items-baseline',
  '[&_[data-part=branch-text]]:flex [&_[data-part=branch-text]]:items-baseline',
].join(' ');

const jsonTree = [
  'flex flex-col text-[12px] leading-[1.8] font-mono',
  '[&_svg]:w-3 [&_svg]:h-3',
  '[&_[data-type=string]]:text-[var(--json-string)]',
  '[&_[data-type=number]]:text-[var(--json-number)]',
  '[&_[data-type=boolean]]:text-[var(--json-boolean)] [&_[data-type=boolean]]:font-semibold',
  '[&_[data-type=null]]:text-[var(--json-null)] [&_[data-type=null]]:italic',
  '[&_[data-kind=brace]]:text-foreground/60 [&_[data-kind=brace]]:font-bold',
  '[&_[data-kind=key]]:text-[var(--json-key)] [&_[data-kind=key]]:font-medium',
  '[&_[data-kind=colon]]:text-muted-foreground/60 [&_[data-kind=colon]]:mx-0.5',
  '[&_[data-kind=preview-text]]:text-muted-foreground/50 [&_[data-kind=preview-text]]:italic',
].join(' ');

function JsonBlock({ value, label }: { value: unknown; label: string }) {
  const text = JSON.stringify(value, null, 2);
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div className="relative mt-1">
        <div className="rounded bg-muted p-2 pr-8 overflow-auto max-h-64">
          <JsonTreeView.Root defaultExpandedDepth={2} className={jsonTreeRoot} data={value}>
            <JsonTreeView.Tree className={jsonTree} arrow={<IconChevronRight size={12} />} />
          </JsonTreeView.Root>
        </div>
        <Clipboard.Root value={text}>
          <Clipboard.Trigger
            className="absolute right-1.5 top-1.5 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
            title="Copy JSON"
          >
            <Clipboard.Indicator copied={<IconCheck size={12} className="text-primary" />}>
              <IconCopy size={12} />
            </Clipboard.Indicator>
          </Clipboard.Trigger>
        </Clipboard.Root>
      </div>
    </div>
  );
}

function isNonEmptyObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length > 0;
}

function isNonEmptyArray(v: unknown): v is unknown[] {
  return Array.isArray(v) && v.length > 0;
}

/* ------------------------------------------------------------------ */
/*  Parameters table (full — includes Values column)                   */
/* ------------------------------------------------------------------ */

function ParametersTable({ params }: { params: ParamDef[] }) {
  return (
    <div className="overflow-auto rounded-md border border-border">
      <table className="min-w-full text-xs">
        <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
          <tr>
            <th className="px-2 py-1.5 text-left font-medium">Name</th>
            <th className="px-2 py-1.5 text-left font-medium">Type</th>
            <th className="px-2 py-1.5 text-left font-medium">Req</th>
            <th className="px-2 py-1.5 text-left font-medium">Default</th>
            <th className="px-2 py-1.5 text-left font-medium">Values</th>
            <th className="px-2 py-1.5 text-left font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p) => (
            <tr key={p.name} className="border-t border-border/30">
              <td className="px-2 py-1 font-mono font-medium text-foreground">{p.name}</td>
              <td className="px-2 py-1 text-muted-foreground">{p.type}</td>
              <td className="px-2 py-1">
                {p.required ? (
                  <span className="rounded bg-primary/10 px-1 text-[10px] font-medium text-primary">yes</span>
                ) : (
                  <span className="text-muted-foreground/40">-</span>
                )}
              </td>
              <td className="px-2 py-1 font-mono text-muted-foreground/70">
                {p.default !== undefined ? String(p.default) : '-'}
              </td>
              <td className="max-w-[200px] truncate px-2 py-1 text-muted-foreground/70">
                {p.values ? p.values.join(' | ') : '-'}
              </td>
              <td className="px-2 py-1 text-muted-foreground">{p.description ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ================================================================== */
/*  CARDS VIEW — FunctionCard (expandable, scannable)                  */
/* ================================================================== */

function FunctionCard({ fn, baseUrl }: { fn: ServiceFunctionRow; baseUrl: string }) {
  const [expanded, setExpanded] = useState(false);
  const params = fn.parameter_schema ?? [];
  const tags = fn.tags ?? [];

  return (
    <div className="flex flex-col bg-card border border-border rounded-xl overflow-hidden transition-all hover:border-primary/50">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex flex-col gap-2 p-4 text-left w-full"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1 min-w-0">
            <span className="font-semibold text-[0.9375rem] text-foreground leading-tight flex items-center gap-2">
              <span className="font-mono">{fn.function_name}</span>
              {fn.deprecated && <Pill variant="red">Deprecated</Pill>}
              {fn.beta && <Pill variant="amber">Beta</Pill>}
            </span>
            {fn.label !== fn.function_name && (
              <span className="text-xs text-muted-foreground">{fn.label}</span>
            )}
          </div>
          <IconChevronDown
            size={16}
            className={`shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
            {fn.http_method}
          </span>
          <code className="truncate font-mono text-foreground/80">{fn.entrypoint}</code>
        </div>

        {fn.description && (
          <p className={`text-[0.8125rem] text-muted-foreground leading-relaxed m-0 ${expanded ? '' : 'line-clamp-2'}`}>
            {fn.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-1">
          <Pill variant="primary">{fn.function_type}</Pill>
          {params.length > 0 && (
            <Pill>{params.length} param{params.length !== 1 ? 's' : ''}</Pill>
          )}
          {tags.slice(0, 3).map((t) => <Pill key={t}>{t}</Pill>)}
          {tags.length > 3 && <Pill>+{tags.length - 3}</Pill>}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          {/* Endpoint with full URL copy */}
          <div className="flex items-center gap-2">
            <SectionLabel>Endpoint</SectionLabel>
            <code className="rounded bg-muted px-2 py-1 font-mono text-xs text-foreground flex-1 truncate">
              {fn.entrypoint}
            </code>
            <CopyButton value={`${baseUrl}${fn.entrypoint}`} label="Copy full URL" />
          </div>

          {fn.content_type && fn.content_type !== 'application/json' && (
            <div className="flex items-center gap-2">
              <SectionLabel>Content Type</SectionLabel>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{fn.content_type}</code>
            </div>
          )}

          {fn.long_description && (
            <div>
              <SectionLabel>Details</SectionLabel>
              <p className="mt-1 text-xs leading-relaxed text-foreground/70 whitespace-pre-line">{fn.long_description}</p>
            </div>
          )}

          {fn.when_to_use && (
            <div>
              <SectionLabel>When to use</SectionLabel>
              <p className="mt-1 text-xs leading-relaxed text-foreground/60 italic">{fn.when_to_use}</p>
            </div>
          )}

          {/* Auth */}
          <div className="flex items-center gap-2">
            <SectionLabel>Auth</SectionLabel>
            {fn.auth_type && fn.auth_type !== 'none' ? (
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{fn.auth_type}</span>
            ) : (
              <span className="text-xs text-muted-foreground/50">Inherits from service</span>
            )}
          </div>

          {params.length > 0 && (
            <div>
              <SectionLabel>Parameters ({params.length})</SectionLabel>
              <div className="mt-1">
                <ParametersTable params={params} />
              </div>
            </div>
          )}

          {/* Tags (full) */}
          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <SectionLabel>Tags</SectionLabel>
              {tags.map((t) => <Pill key={t}>{t}</Pill>)}
            </div>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            {fn.source_task_class && (
              <span className="inline-flex items-center gap-1">
                <SectionLabel>Task Class</SectionLabel>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground/80">{fn.source_task_class}</code>
              </span>
            )}
            {fn.plugin_group && (
              <span className="inline-flex items-center gap-1">
                <SectionLabel>Group</SectionLabel>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground/80">{fn.plugin_group}</code>
              </span>
            )}
            {fn.provider_docs_url && (
              <a href={fn.provider_docs_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline">
                Provider docs <IconExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  REFERENCE VIEW — FunctionReference (full API doc per function)     */
/* ================================================================== */

function FunctionReference({ fn, baseUrl }: { fn: ServiceFunctionRow; baseUrl: string }) {
  const params = fn.parameter_schema ?? [];
  const tags = fn.tags ?? [];
  const fullUrl = `${baseUrl}${fn.entrypoint}`;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-muted/30 px-5 py-3 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-mono text-sm font-semibold text-foreground">{fn.function_name}</h4>
          <Pill variant="primary">{fn.function_type}</Pill>
          {fn.deprecated && <Pill variant="red">Deprecated</Pill>}
          {fn.beta && <Pill variant="amber">Beta</Pill>}
          {fn.provider_docs_url && (
            <a href={fn.provider_docs_url} target="_blank" rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
              Provider docs <IconExternalLink size={11} />
            </a>
          )}
        </div>

        {fn.label !== fn.function_name && (
          <p className="text-xs text-muted-foreground">{fn.label}</p>
        )}

        {/* Endpoint bar */}
        <div className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border/50 bg-background px-2 py-1 text-xs leading-tight">
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
            {fn.http_method}
          </span>
          <code className="max-w-[50rem] truncate font-mono text-foreground/90">{fn.entrypoint}</code>
          <CopyButton value={fullUrl} label="Copy full URL" />
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        {/* Description */}
        {fn.description && (
          <p className="max-w-[70ch] text-xs leading-relaxed text-foreground/70">{fn.description}</p>
        )}

        {fn.long_description && (
          <div>
            <SectionLabel>Details</SectionLabel>
            <p className="mt-1 max-w-[70ch] text-xs leading-relaxed text-foreground/70 whitespace-pre-line">
              {fn.long_description}
            </p>
          </div>
        )}

        {fn.when_to_use && (
          <div>
            <SectionLabel>When to use</SectionLabel>
            <p className="mt-1 max-w-[70ch] text-xs leading-relaxed text-foreground/60 italic">{fn.when_to_use}</p>
          </div>
        )}

        {/* Content type + auth bar */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 border-t border-border/30 pt-3 text-xs">
          {fn.content_type && (
            <div className="flex items-center gap-1.5">
              <SectionLabel>Content Type</SectionLabel>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">{fn.content_type}</code>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <SectionLabel>Auth</SectionLabel>
            {fn.auth_type && fn.auth_type !== 'none' ? (
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">{fn.auth_type}</span>
            ) : (
              <span className="text-muted-foreground/50">Inherits</span>
            )}
          </div>
          {tags.length > 0 && (
            <div className="flex items-center gap-1.5">
              <SectionLabel>Tags</SectionLabel>
              {tags.map((t) => <Pill key={t}>{t}</Pill>)}
            </div>
          )}
        </div>

        {/* Compact metadata: task class, group */}
        {(fn.source_task_class || fn.plugin_group) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px]">
            {fn.source_task_class && (
              <span className="inline-flex items-center gap-1">
                <SectionLabel>Task Class</SectionLabel>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground/80">{fn.source_task_class}</code>
              </span>
            )}
            {fn.plugin_group && (
              <span className="inline-flex items-center gap-1">
                <SectionLabel>Group</SectionLabel>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground/80">{fn.plugin_group}</code>
              </span>
            )}
          </div>
        )}

        {/* Parameters */}
        {params.length > 0 && (
          <div>
            <SectionLabel>Parameters ({params.length})</SectionLabel>
            <div className="mt-1">
              <ParametersTable params={params} />
            </div>
          </div>
        )}

        {/* JSON trees grid */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {isNonEmptyObject(fn.result_schema) && (
            <JsonBlock value={fn.result_schema} label="Result Schema" />
          )}
          {isNonEmptyObject(fn.request_example) && (
            <JsonBlock value={fn.request_example} label="Request Example" />
          )}
          {isNonEmptyObject(fn.response_example) && (
            <JsonBlock value={fn.response_example} label="Response Example" />
          )}
          {isNonEmptyObject(fn.auth_config) && (
            <JsonBlock value={fn.auth_config} label="Auth Config" />
          )}
          {isNonEmptyArray(fn.examples) && (
            <JsonBlock value={fn.examples} label={`Examples (${fn.examples.length})`} />
          )}
          {isNonEmptyArray(fn.metrics) && (
            <JsonBlock value={fn.metrics} label={`Metrics (${fn.metrics.length})`} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  SERVICE HERO — shared between both views                          */
/* ================================================================== */

function ServiceHero({ service }: { service: ServiceDetail }) {
  const healthColor = HEALTH_COLORS[service.health_status] ?? HEALTH_COLORS.unknown;

  return (
    <div className="mb-6">
      <div className="flex items-start gap-4">
        <span
          className="inline-flex items-center justify-center w-14 h-14 rounded-xl text-white text-xl font-bold shrink-0"
          style={{ backgroundColor: iconColor(service.service_name) }}
        >
          {service.service_name.charAt(0).toUpperCase()}
        </span>
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground">{service.service_name}</h2>
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: healthColor }}
              title={service.health_status}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill variant="primary">{service.service_type_label}</Pill>
            <Pill>{service.health_status}</Pill>
            {service.docs_url && (
              <a href={service.docs_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                Docs <IconExternalLink size={12} />
              </a>
            )}
          </div>
          {service.description && (
            <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
              {service.description}
            </p>
          )}
        </div>
      </div>

      {/* Service metadata row */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <div className="flex items-center gap-1.5">
          <SectionLabel>Base URL</SectionLabel>
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">{service.base_url}</code>
          <CopyButton value={service.base_url} label="Copy base URL" />
        </div>

        {service.auth_type && service.auth_type !== 'none' && (
          <div className="flex items-center gap-1.5">
            <SectionLabel>Auth</SectionLabel>
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">{service.auth_type}</span>
          </div>
        )}

        {service.last_heartbeat && (
          <div className="flex items-center gap-1.5">
            <SectionLabel>Last Heartbeat</SectionLabel>
            <span className="text-muted-foreground">{formatTimestamp(service.last_heartbeat)}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <SectionLabel>Updated</SectionLabel>
          <span className="text-muted-foreground">{formatTimestamp(service.updated_at)}</span>
        </div>
      </div>

      {/* Service config tree */}
      {isNonEmptyObject(service.config) && (
        <div className="mt-3 max-w-md">
          <JsonBlock value={service.config} label={`Config (${Object.keys(service.config!).length} keys)`} />
        </div>
      )}

      {/* Service auth config */}
      {isNonEmptyObject(service.auth_config) && (
        <div className="mt-3 max-w-md">
          <JsonBlock value={service.auth_config} label="Auth Config" />
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  VIEW TOGGLE                                                        */
/* ================================================================== */

type ViewMode = 'cards' | 'reference';

function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  const btn = (m: ViewMode, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      onClick={() => onChange(m)}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
        mode === m
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-background p-0.5">
      {btn('cards', <IconLayoutCards size={14} />, 'Cards')}
      {btn('reference', <IconFileDescription size={14} />, 'Reference')}
    </div>
  );
}

/* ================================================================== */
/*  PAGE                                                               */
/* ================================================================== */

type ServiceDetail = ServiceRow & { service_type_label: string };

export default function ServiceDetailPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();

  const [service, setService] = useState<ServiceDetail | null>(null);
  const [functions, setFunctions] = useState<ServiceFunctionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  useEffect(() => {
    if (!serviceId) return;

    async function load() {
      setLoading(true);
      setError(null);

      const [svcRes, fnRes] = await Promise.all([
        supabase
          .from('registry_services')
          .select('*, registry_service_types(label)')
          .eq('service_id', serviceId)
          .single(),
        supabase
          .from('registry_service_functions')
          .select('*')
          .eq('service_id', serviceId!)
          .eq('enabled', true)
          .order('function_name'),
      ]);

      if (svcRes.error) {
        setError(svcRes.error.message);
        setLoading(false);
        return;
      }
      if (fnRes.error) {
        setError(fnRes.error.message);
        setLoading(false);
        return;
      }

      const raw = svcRes.data;
      const typeLabel = (
        Array.isArray(raw.registry_service_types)
          ? raw.registry_service_types[0]?.label
          : (raw.registry_service_types as { label: string } | null)?.label
      ) ?? raw.service_type;

      setService({ ...(raw as unknown as ServiceRow), service_type_label: typeLabel });
      setFunctions((fnRes.data ?? []) as ServiceFunctionRow[]);
      setLoading(false);
    }

    void load();
  }, [serviceId]);

  const baseUrl = service?.base_url ?? '';

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={service?.service_name ?? 'Service Detail'} />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        {/* Top bar: back + view toggle */}
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/app/marketplace/services')}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <IconArrowLeft size={14} />
            Back to Services
          </button>
          {!loading && !error && service && (
            <ViewToggle mode={viewMode} onChange={setViewMode} />
          )}
        </div>

        {loading && (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Loading...
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && service && (
          <>
            <ServiceHero service={service} />

            {/* Functions header */}
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-foreground">
                Functions{' '}
                <span className="font-normal text-muted-foreground">({functions.length})</span>
              </h3>
            </div>

            {functions.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">
                No functions registered for this service.
              </p>
            ) : viewMode === 'cards' ? (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {functions.map((fn) => (
                  <FunctionCard key={fn.function_id} fn={fn} baseUrl={baseUrl} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {functions.map((fn) => (
                  <FunctionReference key={fn.function_id} fn={fn} baseUrl={baseUrl} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
