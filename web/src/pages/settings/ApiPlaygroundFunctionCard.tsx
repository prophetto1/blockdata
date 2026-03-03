import { Clipboard } from '@ark-ui/react/clipboard';
import { JsonTreeView } from '@ark-ui/react/json-tree-view';
import { IconCheck, IconChevronRight, IconCopy } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  jsonTreeRootClass,
  jsonTreeClass,
  isNonEmptyObject,
  isNonEmptyArray,
} from './api-playground-shared';
import type { ParamDef, ServiceFunctionRow } from './services-panel.types';

/* ------------------------------------------------------------------ */
/*  ApiSheetSection                                                    */
/* ------------------------------------------------------------------ */

function ApiSheetSection({
  label,
  children,
  empty,
}: {
  label: string;
  children?: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="py-2">
      <dt className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {label}
      </dt>
      <dd>
        {empty ? (
          <span className="text-xs italic text-muted-foreground/40">
            Not configured
          </span>
        ) : (
          children
        )}
      </dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  JsonTreeBlock                                                      */
/* ------------------------------------------------------------------ */

function JsonTreeBlock({ value }: { value: unknown }) {
  const text = JSON.stringify(value, null, 2);
  return (
    <div className="relative">
      <ScrollArea className="max-h-50">
        <div className="rounded bg-muted p-2 pr-8">
          <JsonTreeView.Root
            defaultExpandedDepth={2}
            className={jsonTreeRootClass}
            data={value}
          >
            <JsonTreeView.Tree
              className={jsonTreeClass}
              arrow={<IconChevronRight size={12} />}
            />
          </JsonTreeView.Root>
        </div>
      </ScrollArea>
      <Clipboard.Root value={text}>
        <Clipboard.Trigger
          className="absolute right-1.5 top-1.5 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
          title="Copy JSON"
        >
          <Clipboard.Indicator
            copied={<IconCheck size={12} className="text-primary" />}
          >
            <IconCopy size={12} />
          </Clipboard.Indicator>
        </Clipboard.Trigger>
      </Clipboard.Root>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ParametersTable                                                    */
/* ------------------------------------------------------------------ */

function ParametersTable({ params }: { params: ParamDef[] }) {
  return (
    <ScrollArea className="max-h-70 rounded border border-border/50">
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
              <td className="px-2 py-1 font-mono font-medium text-foreground">
                {p.name}
              </td>
              <td className="px-2 py-1 text-muted-foreground">{p.type}</td>
              <td className="px-2 py-1">
                {p.required ? (
                  <Badge variant="default" size="xs">
                    yes
                  </Badge>
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
              <td className="px-2 py-1 text-muted-foreground">
                {p.description ?? '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  );
}

/* ------------------------------------------------------------------ */
/*  Badge style constants                                              */
/* ------------------------------------------------------------------ */

const badgeDeprecated =
  'bg-red-500/10 text-red-400 rounded px-1.5 py-0.5 text-[10px] font-medium';
const badgeBeta =
  'bg-amber-500/10 text-amber-400 rounded px-1.5 py-0.5 text-[10px] font-medium';
const badgeEnabled =
  'bg-emerald-500/10 text-emerald-500 rounded px-1.5 py-0.5 text-[10px] font-medium';
const badgeDisabled =
  'bg-muted text-muted-foreground/50 rounded px-1.5 py-0.5 text-[10px] font-medium';

/* ------------------------------------------------------------------ */
/*  ApiPlaygroundFunctionCard                                          */
/* ------------------------------------------------------------------ */

export function ApiPlaygroundFunctionCard({
  fn,
}: {
  fn: ServiceFunctionRow;
}) {
  const params = fn.parameter_schema ?? [];
  const tags = fn.tags ?? [];

  return (
    <div className="space-y-1">
      {/* ============================================================ */}
      {/*  ZONE A — Identity (compact header)                          */}
      {/* ============================================================ */}

      {/* Row 1: function_name + type badge + deprecated/beta/enabled */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-sm font-semibold text-foreground">
          {fn.function_name}
        </span>
        <Badge variant="blue" size="xs">
          {fn.function_type}
        </Badge>
        {fn.deprecated && <span className={badgeDeprecated}>deprecated</span>}
        {fn.beta && <span className={badgeBeta}>beta</span>}
        {fn.enabled ? (
          <span className={badgeEnabled}>enabled</span>
        ) : (
          <span className={badgeDisabled}>disabled</span>
        )}
      </div>

      {/* Row 2: HTTP method + entrypoint + content_type + copy */}
      <div className="flex items-center gap-2">
        <Badge variant="blue" size="xs" className="shrink-0 uppercase">
          {fn.http_method}
        </Badge>
        <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 font-mono text-xs text-foreground">
          {fn.entrypoint}
        </code>
        {fn.content_type && fn.content_type !== 'application/json' && (
          <Badge variant="gray" size="xs" className="shrink-0">
            {fn.content_type}
          </Badge>
        )}
        <Clipboard.Root value={fn.entrypoint}>
          <Clipboard.Trigger
            className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
            title="Copy endpoint URL"
          >
            <Clipboard.Indicator
              copied={<IconCheck size={12} className="text-primary" />}
            >
              <IconCopy size={12} />
            </Clipboard.Indicator>
          </Clipboard.Trigger>
        </Clipboard.Root>
      </div>

      {/* Row 3: description */}
      {fn.description && (
        <p className="max-w-[70ch] text-xs text-foreground/70">
          {fn.description}
        </p>
      )}

      {/* Row 4: tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {tags.map((t) => (
            <Badge key={t} variant="gray" size="xs">
              {t}
            </Badge>
          ))}
        </div>
      )}

      {/* ============================================================ */}
      {/*  ZONE B — Reference (two-column on lg)                       */}
      {/* ============================================================ */}

      <div className="border-t border-border/30 my-3" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left column: Parameters table */}
        <div>
          {params.length > 0 ? (
            <ApiSheetSection label={`Parameters (${params.length})`}>
              <ParametersTable params={params} />
            </ApiSheetSection>
          ) : (
            <ApiSheetSection label="Parameters" empty />
          )}
        </div>

        {/* Right column: stacked JSON trees */}
        <div className="space-y-2">
          {isNonEmptyObject(fn.result_schema) && (
            <ApiSheetSection label="Result Schema">
              <JsonTreeBlock value={fn.result_schema} />
            </ApiSheetSection>
          )}

          {isNonEmptyObject(fn.request_example) && (
            <ApiSheetSection label="Request Example">
              <JsonTreeBlock value={fn.request_example} />
            </ApiSheetSection>
          )}

          {isNonEmptyObject(fn.response_example) && (
            <ApiSheetSection label="Response Example">
              <JsonTreeBlock value={fn.response_example} />
            </ApiSheetSection>
          )}
        </div>
      </div>

      {/* ---- Full-width below grid ---- */}

      {fn.long_description && (
        <ApiSheetSection label="Details">
          <p className="text-xs leading-relaxed text-foreground/70 whitespace-pre-line">
            {fn.long_description}
          </p>
        </ApiSheetSection>
      )}

      {fn.when_to_use && (
        <ApiSheetSection label="When to Use">
          <p className="text-[11px] text-foreground/50 italic max-w-[70ch]">
            {fn.when_to_use}
          </p>
        </ApiSheetSection>
      )}

      {/* Auth row */}
      {(fn.auth_type || isNonEmptyObject(fn.auth_config)) && (
        <ApiSheetSection label="Authentication">
          <div className="space-y-2">
            {fn.auth_type && (
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                {fn.auth_type}
              </span>
            )}
            {isNonEmptyObject(fn.auth_config) && (
              <JsonTreeBlock value={fn.auth_config} />
            )}
          </div>
        </ApiSheetSection>
      )}

      {isNonEmptyArray(fn.examples) && (
        <ApiSheetSection label={`Examples (${fn.examples.length})`}>
          <JsonTreeBlock value={fn.examples} />
        </ApiSheetSection>
      )}

      {isNonEmptyArray(fn.metrics) && (
        <ApiSheetSection label={`Metrics (${fn.metrics.length})`}>
          <JsonTreeBlock value={fn.metrics} />
        </ApiSheetSection>
      )}

      {/* Metadata row */}
      {(fn.source_task_class || fn.plugin_group || fn.provider_docs_url) && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 border-t border-border/30 pt-2 text-xs">
          {fn.source_task_class && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Task Class
              </span>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                {fn.source_task_class}
              </code>
            </div>
          )}
          {fn.plugin_group && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Plugin Group
              </span>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                {fn.plugin_group}
              </code>
            </div>
          )}
          {fn.provider_docs_url && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Docs
              </span>
              <a
                href={fn.provider_docs_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                {fn.provider_docs_url}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}