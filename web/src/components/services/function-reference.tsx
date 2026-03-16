import { Accordion } from '@ark-ui/react/accordion';
import { Clipboard } from '@ark-ui/react/clipboard';
import { JsonTreeView } from '@ark-ui/react/json-tree-view';
import {
  IconCheck,
  IconChevronRight,
  IconCopy,
  IconExternalLink,
} from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ParamDef, ServiceFunctionRow } from '@/pages/settings/services-panel.types';

/* ------------------------------------------------------------------ */
/*  Primitives                                                         */
/* ------------------------------------------------------------------ */

export function SectionLabel({
  children,
  size = 'default',
}: {
  children: React.ReactNode;
  size?: 'default' | 'lg';
}) {
  const sizeClass = size === 'lg'
    ? 'text-xs'
    : 'text-[10px]';
  return (
    <span className={`${sizeClass} font-semibold uppercase tracking-wider text-foreground/85`}>
      {children}
    </span>
  );
}

export function CopyButton({ value, label }: { value: string; label?: string }) {
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

export function Pill({
  children,
  variant = 'muted',
  className,
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'muted' | 'red' | 'amber';
  className?: string;
}) {
  const badgeVariant =
    variant === 'primary' ? 'default' :
    variant === 'red' ? 'red' :
    variant === 'amber' ? 'yellow' :
    'gray';
  return (
    <Badge variant={badgeVariant} size="sm" className={`font-medium ${className ?? ''}`}>
      {children}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/*  JSON tree styles                                                   */
/* ------------------------------------------------------------------ */

export const jsonTreeRoot = [
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

export const jsonTreeStyles = [
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

/* ------------------------------------------------------------------ */
/*  Type guards                                                        */
/* ------------------------------------------------------------------ */

export function isNonEmptyObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length > 0;
}

export function isNonEmptyArray(v: unknown): v is unknown[] {
  return Array.isArray(v) && v.length > 0;
}

/* ------------------------------------------------------------------ */
/*  JsonBlock                                                          */
/* ------------------------------------------------------------------ */

export function JsonBlock({
  value,
  label,
  defaultExpanded = 2,
  showLabel = true,
  labelSize = 'default',
  className,
  maxHeight = 'max-h-64',
}: {
  value: unknown;
  label: string;
  defaultExpanded?: number;
  showLabel?: boolean;
  labelSize?: 'default' | 'lg';
  className?: string;
  /** Tailwind max-height class for the scroll area. Default: 'max-h-64' */
  maxHeight?: string;
}) {
  const text = JSON.stringify(value, null, 2);
  return (
    <div className={className}>
      {showLabel && <SectionLabel size={labelSize}>{label}</SectionLabel>}
      <div className="relative mt-1">
        <ScrollArea className={`${maxHeight} rounded bg-muted`} viewportClass="p-2 pr-8">
          <JsonTreeView.Root defaultExpandedDepth={defaultExpanded} className={jsonTreeRoot} data={value}>
            <JsonTreeView.Tree className={jsonTreeStyles} arrow={<IconChevronRight size={12} />} />
          </JsonTreeView.Root>
        </ScrollArea>
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

/* ------------------------------------------------------------------ */
/*  ParametersTable                                                    */
/* ------------------------------------------------------------------ */

export function ParametersTable({ params }: { params: ParamDef[] }) {
  return (
    <ScrollArea className="rounded-md border border-border">
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
              <td className="max-w-[200px] px-2 py-1 text-muted-foreground/70 whitespace-normal break-words">
                {p.values ? p.values.join(' | ') : '-'}
              </td>
              <td className="px-2 py-1 text-muted-foreground">{p.description ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  );
}

/* ------------------------------------------------------------------ */
/*  ExampleBlocks                                                      */
/* ------------------------------------------------------------------ */

type ExampleDoc = { title?: string; lang?: string; code: string };

function toExampleDocs(value: unknown[]): ExampleDoc[] {
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const candidate = item as Record<string, unknown>;
    const code = typeof candidate.code === 'string' ? candidate.code : null;
    if (!code) return [];
    return [{
      code,
      title: typeof candidate.title === 'string' ? candidate.title : undefined,
      lang: typeof candidate.lang === 'string' ? candidate.lang : undefined,
    }];
  });
}

export function ExampleBlocks({
  value,
  headingSize = 'default',
}: {
  value: unknown[];
  headingSize?: 'default' | 'lg';
}) {
  const docs = toExampleDocs(value);
  if (docs.length === 0) {
    return <JsonBlock value={value} label={`Examples (${value.length})`} />;
  }

  return (
    <div>
      <SectionLabel size={headingSize}>Examples ({docs.length})</SectionLabel>
      <Accordion.Root collapsible className="mt-1.5 space-y-2">
        {docs.map((doc, index) => (
          <Accordion.Item
            key={`${doc.title ?? 'example'}-${index}`}
            value={`example-${index}`}
            className="overflow-hidden rounded-md border border-border"
          >
            <div className="flex items-start gap-2 bg-muted/30 px-2 py-1.5">
              <Accordion.ItemTrigger className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <Accordion.ItemIndicator className="inline-flex shrink-0 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-90">
                  <IconChevronRight size={12} />
                </Accordion.ItemIndicator>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-medium uppercase text-foreground">
                      {`EXAMPLE ${index + 1}`}
                    </span>
                    {doc.lang && (
                      <span className="rounded bg-muted px-1 py-px font-mono text-[10px] uppercase text-muted-foreground">
                        {doc.lang}
                      </span>
                    )}
                  </div>
                  {doc.title && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{doc.title}</p>
                  )}
                </div>
              </Accordion.ItemTrigger>
              <Clipboard.Root value={doc.code}>
                <Clipboard.Trigger
                  title="Copy example code"
                  className="inline-flex shrink-0 items-center gap-1 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Clipboard.Indicator copied={<IconCheck size={12} className="text-primary" />}>
                    <IconCopy size={12} />
                  </Clipboard.Indicator>
                </Clipboard.Trigger>
              </Clipboard.Root>
            </div>
            <Accordion.ItemContent className="overflow-hidden border-t border-border/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0">
              <ScrollArea className="max-h-64 bg-background" viewportClass="px-2 py-2">
                <pre className="text-xs leading-relaxed text-foreground">
                  <code className="whitespace-pre-wrap break-words">{doc.code}</code>
                </pre>
              </ScrollArea>
            </Accordion.ItemContent>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MetricsTable                                                       */
/* ------------------------------------------------------------------ */

type MetricDoc = { name: string; type?: string; description?: string };

function toMetricDocs(value: unknown[]): MetricDoc[] {
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const candidate = item as Record<string, unknown>;
    const name = typeof candidate.name === 'string' ? candidate.name : null;
    if (!name) return [];
    return [{
      name,
      type: typeof candidate.type === 'string' ? candidate.type : undefined,
      description: typeof candidate.description === 'string' ? candidate.description : undefined,
    }];
  });
}

export function MetricsTable({
  value,
  headingSize = 'default',
}: {
  value: unknown[];
  headingSize?: 'default' | 'lg';
}) {
  const docs = toMetricDocs(value);
  if (docs.length === 0) {
    return <JsonBlock value={value} label={`Metrics (${value.length})`} />;
  }

  return (
    <div>
      <SectionLabel size={headingSize}>Metrics ({docs.length})</SectionLabel>
      <ScrollArea className="mt-1.5 rounded-md border border-border">
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
      </ScrollArea>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FunctionReferenceHeader                                            */
/* ------------------------------------------------------------------ */

export function FunctionReferenceHeader({
  fn,
  baseUrl,
}: {
  fn: ServiceFunctionRow;
  baseUrl: string;
}) {
  const fullUrl = `${baseUrl}${fn.entrypoint}`;

  return (
    <div className="border-b border-border bg-card px-3 py-2.5 space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold text-foreground">{fn.function_name}</h4>
        <Pill variant="primary">{fn.function_type}</Pill>
        {fn.deprecated && <Pill variant="red">Deprecated</Pill>}
        {fn.beta && <Pill variant="amber">Beta</Pill>}
        <div className="ml-auto flex items-center gap-2">
          {fn.provider_docs_url && (
            <a href={fn.provider_docs_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
              Provider docs <IconExternalLink size={11} />
            </a>
          )}
        </div>
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

/* ------------------------------------------------------------------ */
/*  FunctionReferenceBody                                              */
/* ------------------------------------------------------------------ */

export function FunctionReferenceBody({ fn }: { fn: ServiceFunctionRow }) {
  const params = fn.parameter_schema ?? [];
  const tags = fn.tags ?? [];

  return (
    <div className="px-5 py-4 space-y-4">
      {/* Content type + auth bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs">
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
        <Accordion.Root collapsible className="rounded-md border border-border">
          <Accordion.Item value="parameters">
            <Accordion.ItemTrigger className="flex w-full items-center gap-2 bg-muted/30 px-2 py-1.5 text-left">
              <Accordion.ItemIndicator className="inline-flex shrink-0 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-90">
                <IconChevronRight size={12} />
              </Accordion.ItemIndicator>
              <SectionLabel size="lg">Parameters ({params.length})</SectionLabel>
            </Accordion.ItemTrigger>
            <Accordion.ItemContent className="overflow-hidden border-t border-border/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0">
              <div className="p-2">
                <ParametersTable params={params} />
              </div>
            </Accordion.ItemContent>
          </Accordion.Item>
        </Accordion.Root>
      )}

      {/* JSON trees grid */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {isNonEmptyObject(fn.result_schema) && (
          <Accordion.Root collapsible className="rounded-md border border-border">
            <Accordion.Item value="result-schema">
              <Accordion.ItemTrigger className="flex w-full items-center gap-2 bg-muted/30 px-2 py-1.5 text-left">
                <Accordion.ItemIndicator className="inline-flex shrink-0 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-90">
                  <IconChevronRight size={12} />
                </Accordion.ItemIndicator>
                <SectionLabel size="lg">Result Schema</SectionLabel>
              </Accordion.ItemTrigger>
              <Accordion.ItemContent className="overflow-hidden border-t border-border/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0">
                <div className="p-2">
                  <JsonBlock value={fn.result_schema} label="Result Schema" labelSize="lg" showLabel={false} />
                </div>
              </Accordion.ItemContent>
            </Accordion.Item>
          </Accordion.Root>
        )}
        {isNonEmptyObject(fn.request_example) && (
          <JsonBlock value={fn.request_example} label="Request Example" labelSize="lg" />
        )}
        {isNonEmptyObject(fn.response_example) && (
          <JsonBlock value={fn.response_example} label="Response Example" labelSize="lg" />
        )}
        {isNonEmptyObject(fn.auth_config) && (
          <JsonBlock value={fn.auth_config} label="Auth Config" labelSize="lg" />
        )}
      </div>

      {isNonEmptyArray(fn.examples) && (
        <ExampleBlocks value={fn.examples} headingSize="lg" />
      )}

      {isNonEmptyArray(fn.metrics) && (
        <MetricsTable value={fn.metrics} headingSize="lg" />
      )}

      {(fn.description || fn.long_description || fn.when_to_use) && (
        <div className="space-y-2 border-t border-border/30 pt-3">
          <SectionLabel size="lg">Details</SectionLabel>
          {fn.description && (
            <p className="max-w-[70ch] text-xs leading-relaxed text-foreground/70">{fn.description}</p>
          )}
          {fn.long_description && (
            <p className="max-w-[70ch] text-xs leading-relaxed text-foreground/70 whitespace-pre-line">
              {fn.long_description}
            </p>
          )}
          {fn.when_to_use && (
            <div>
              <SectionLabel size="lg">When to use</SectionLabel>
              <p className="mt-1 max-w-[70ch] text-xs leading-relaxed text-foreground/60 italic">{fn.when_to_use}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
