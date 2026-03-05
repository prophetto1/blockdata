import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  IconChevronRight, IconCopy, IconCheck,
  IconExternalLink,
} from '@tabler/icons-react';
import { ArrowLeft02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Clipboard } from '@ark-ui/react/clipboard';
import { JsonTreeView } from '@ark-ui/react/json-tree-view';
import { PageHeader } from '@/components/common/PageHeader';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import type { ServiceFunctionRow, ServiceRow, ParamDef } from '@/pages/settings/services-panel.types';

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

function JsonBlock({
  value,
  label,
  defaultExpanded = 2,
  showLabel = true,
}: {
  value: unknown;
  label: string;
  defaultExpanded?: number;
  showLabel?: boolean;
}) {
  const text = JSON.stringify(value, null, 2);
  return (
    <div>
      {showLabel && <SectionLabel>{label}</SectionLabel>}
      <div className="relative mt-1">
        <div className="max-h-64 overflow-y-auto overflow-x-hidden rounded bg-muted p-2 pr-8">
          <JsonTreeView.Root defaultExpandedDepth={defaultExpanded} className={jsonTreeRoot} data={value}>
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

type ExampleDoc = {
  title?: string;
  lang?: string;
  code: string;
};

type MetricDoc = {
  name: string;
  type?: string;
  description?: string;
};

function toExampleDocs(value: unknown[]): ExampleDoc[] {
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return [];
    }
    const candidate = item as Record<string, unknown>;
    const code = typeof candidate.code === 'string' ? candidate.code : null;
    if (!code) {
      return [];
    }
    return [{
      code,
      title: typeof candidate.title === 'string' ? candidate.title : undefined,
      lang: typeof candidate.lang === 'string' ? candidate.lang : undefined,
    }];
  });
}

function toMetricDocs(value: unknown[]): MetricDoc[] {
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return [];
    }
    const candidate = item as Record<string, unknown>;
    const name = typeof candidate.name === 'string' ? candidate.name : null;
    if (!name) {
      return [];
    }
    return [{
      name,
      type: typeof candidate.type === 'string' ? candidate.type : undefined,
      description: typeof candidate.description === 'string' ? candidate.description : undefined,
    }];
  });
}

function ExampleBlocks({ value }: { value: unknown[] }) {
  const docs = toExampleDocs(value);
  if (docs.length === 0) {
    return <JsonBlock value={value} label={`Examples (${value.length})`} />;
  }

  return (
    <div>
      <SectionLabel>Examples ({docs.length})</SectionLabel>
      <div className="mt-1.5 space-y-2">
        {docs.map((doc, index) => (
          <div key={`${doc.title ?? 'example'}-${index}`} className="overflow-hidden rounded-md border border-border">
            <div className="flex items-center justify-between gap-2 border-b border-border/50 bg-muted/30 px-2 py-1.5">
              <div className="min-w-0">
                <span className="text-xs font-medium text-foreground">
                  {doc.title ?? `Example ${index + 1}`}
                </span>
                {doc.lang && (
                  <span className="ml-2 rounded bg-muted px-1 py-px font-mono text-[10px] uppercase text-muted-foreground">
                    {doc.lang}
                  </span>
                )}
              </div>
              <CopyButton value={doc.code} label="Copy example code" />
            </div>
            <pre className="max-h-64 overflow-auto bg-background px-2 py-2 text-xs leading-relaxed text-foreground">
              <code>{doc.code}</code>
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricsTable({ value }: { value: unknown[] }) {
  const docs = toMetricDocs(value);
  if (docs.length === 0) {
    return <JsonBlock value={value} label={`Metrics (${value.length})`} />;
  }

  return (
    <div>
      <SectionLabel>Metrics ({docs.length})</SectionLabel>
      <div className="mt-1.5 overflow-auto rounded-md border border-border">
        <table className="min-w-full text-xs">
          <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium">Metric</th>
              <th className="px-2 py-1.5 text-left font-medium">Type</th>
              <th className="px-2 py-1.5 text-left font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((doc) => (
              <tr key={doc.name} className="border-t border-border/30">
                <td className="px-2 py-1 font-mono font-medium text-foreground">{doc.name}</td>
                <td className="px-2 py-1 text-muted-foreground">{doc.type ?? '-'}</td>
                <td className="px-2 py-1 text-muted-foreground">{doc.description ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
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
/*  REFERENCE VIEW — FunctionReference (full API doc per function)     */
/* ================================================================== */

function FunctionReferenceHeader({ fn, baseUrl }: { fn: ServiceFunctionRow; baseUrl: string }) {
  const fullUrl = `${baseUrl}${fn.entrypoint}`;

  return (
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

      <div className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border/50 bg-background px-2 py-1 text-xs leading-tight">
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
          {fn.http_method}
        </span>
        <code className="max-w-[50rem] truncate font-mono text-foreground/90">{fn.entrypoint}</code>
        <CopyButton value={fullUrl} label="Copy full URL" />
      </div>
    </div>
  );
}

function FunctionReference({
  fn,
  baseUrl,
  hideHeader = false,
}: {
  fn: ServiceFunctionRow;
  baseUrl: string;
  hideHeader?: boolean;
}) {
  const params = fn.parameter_schema ?? [];
  const tags = fn.tags ?? [];

  return (
    <div className="overflow-hidden">
      {!hideHeader && <FunctionReferenceHeader fn={fn} baseUrl={baseUrl} />}

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
        </div>

        {isNonEmptyArray(fn.examples) && (
          <ExampleBlocks value={fn.examples} />
        )}

        {isNonEmptyArray(fn.metrics) && (
          <MetricsTable value={fn.metrics} />
        )}
      </div>
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
  const [selectedFunctionId, setSelectedFunctionId] = useState<string | null>(null);
  const [serviceConfigOpen, setServiceConfigOpen] = useState(false);
  const [serviceAuthConfigOpen, setServiceAuthConfigOpen] = useState(false);

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
  const selectedFn = functions.find((fn) => fn.function_id === selectedFunctionId) ?? null;

  // Auto-select first function
  useEffect(() => {
    if (functions.length > 0 && !selectedFunctionId) {
      setSelectedFunctionId(functions[0]!.function_id);
    }
  }, [functions, selectedFunctionId]);

  useEffect(() => {
    setServiceConfigOpen(false);
    setServiceAuthConfigOpen(false);
  }, [serviceId]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={service?.service_name ?? 'Service Detail'} />

      {loading && (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Loading...
        </div>
      )}

      {error && (
        <div className="mx-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && service && (
        <div className="flex min-h-0 flex-1">
          {/* ---- Left sidebar (fixed height, internal scroll) ---- */}
          <aside className="flex w-[28rem] shrink-0 flex-col">
            {/* Service info card */}
            <div className="ml-3 mr-0 mt-3 shrink-0 rounded-xl border border-border bg-card overflow-hidden">
              {/* Header */}
              <div className="space-y-2 p-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/app/marketplace/services')}
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-accent"
                    title="Back to Services"
                  >
                    <HugeiconsIcon
                      icon={ArrowLeft02Icon}
                      size={20}
                      strokeWidth={2}
                      className="text-muted-foreground"
                    />
                  </button>
                  <Pill variant="primary">{service.service_type_label}</Pill>
                  <Pill>{service.health_status}</Pill>
                </div>

                {/* Service metadata */}
                <div className="flex items-center gap-1 text-xs">
                  <SectionLabel>Base URL</SectionLabel>
                  <code className="truncate rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-foreground/80">
                    {service.base_url}
                  </code>
                  <CopyButton value={service.base_url} label="Copy base URL" />
                </div>
              </div>

              {/* Scrollable content: description + config trees */}
              {(service.description || isNonEmptyObject(service.config) || isNonEmptyObject(service.auth_config)) && (
                <ScrollArea className="max-h-48" viewportClass="px-3 pb-3 space-y-3">
                  {service.description && (
                    <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{service.description}</p>
                  )}
                  {isNonEmptyObject(service.config) && (
                    <div className="rounded-md border border-border/50">
                      <button
                        type="button"
                        onClick={() => setServiceConfigOpen((v) => !v)}
                        className="flex w-full items-center justify-between px-2 py-1.5 text-left"
                      >
                        <SectionLabel>{`Config (${Object.keys(service.config!).length} keys)`}</SectionLabel>
                        <IconChevronRight
                          size={12}
                          className={`text-muted-foreground transition-transform ${serviceConfigOpen ? 'rotate-90' : ''}`}
                        />
                      </button>
                      {serviceConfigOpen && (
                        <div className="px-2 pb-2">
                          <JsonBlock value={service.config} label="Config" defaultExpanded={0} showLabel={false} />
                        </div>
                      )}
                    </div>
                  )}
                  {isNonEmptyObject(service.auth_config) && (
                    <div className="mt-1 rounded-md border border-border/50">
                      <button
                        type="button"
                        onClick={() => setServiceAuthConfigOpen((v) => !v)}
                        className="flex w-full items-center justify-between px-2 py-1.5 text-left"
                      >
                        <SectionLabel>Auth Config</SectionLabel>
                        <IconChevronRight
                          size={12}
                          className={`text-muted-foreground transition-transform ${serviceAuthConfigOpen ? 'rotate-90' : ''}`}
                        />
                      </button>
                      {serviceAuthConfigOpen && (
                        <div className="px-2 pb-2">
                          <JsonBlock value={service.auth_config} label="Auth Config" defaultExpanded={0} showLabel={false} />
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>
              )}
            </div>

            {/* Functions card — fills remaining height */}
            <div className="ml-3 mr-0 mt-2 mb-3 flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-card overflow-hidden p-3">
              <p className="mb-2 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Functions ({functions.length})
              </p>
              {functions.length === 0 ? (
                <p className="rounded-md border border-border/50 px-2 py-2 text-xs text-muted-foreground">
                  No functions registered.
                </p>
              ) : (
                <ScrollArea className="min-h-0 flex-1" viewportClass="pr-1 space-y-1">
                  {functions.map((fn) => {
                    const active = fn.function_id === selectedFunctionId;
                    return (
                      <button
                        key={fn.function_id}
                        type="button"
                        onClick={() => setSelectedFunctionId(fn.function_id)}
                        className={`w-full rounded-md border px-2 py-1.5 text-left transition-colors ${
                          active
                            ? 'border-primary/40 bg-primary/10'
                            : 'border-border/40 hover:bg-accent/50'
                        }`}
                      >
                        <p className="font-mono text-xs font-semibold leading-snug text-foreground break-all">{fn.function_name}</p>
                        {fn.label && fn.label !== fn.function_name && (
                          <p className="text-[10px] leading-snug text-muted-foreground break-words">{fn.label}</p>
                        )}
                      </button>
                    );
                  })}
                </ScrollArea>
              )}
            </div>
          </aside>

          {/* ---- Right content (single container: function detail card) ---- */}
          <div className="my-3 ml-3 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card max-w-[50%]">
            {selectedFn ? (
              <>
                <div className="shrink-0">
                  <FunctionReferenceHeader fn={selectedFn} baseUrl={baseUrl} />
                </div>
                <ScrollArea className="min-h-0 flex-1" viewportClass="pl-0 pr-4 pt-0 pb-4">
                  <FunctionReference fn={selectedFn} baseUrl={baseUrl} hideHeader />
                </ScrollArea>
              </>
            ) : (
              <div className="flex min-h-0 flex-1 items-center px-4 py-6 text-sm text-muted-foreground">
                Select a function from the left menu.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
