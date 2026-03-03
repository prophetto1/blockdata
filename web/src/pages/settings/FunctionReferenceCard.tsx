import { Clipboard } from '@ark-ui/react/clipboard';
import { JsonTreeView } from '@ark-ui/react/json-tree-view';
import { IconCheck, IconChevronRight, IconCopy } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ParamDef, ServiceFunctionRow } from './services-panel.types';

/* ------------------------------------------------------------------ */
/*  ApiSheetSection - reusable section wrapper                         */
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
                  <Badge variant="default" size="xs">yes</Badge>
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
/*  JSON tree styles (mirrors Landing.tsx tokens)                      */
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

/* ------------------------------------------------------------------ */
/*  JsonTreeBlock - interactive JSON tree with copy button             */
/* ------------------------------------------------------------------ */

function JsonTreeBlock({ value }: { value: unknown }) {
  const text = JSON.stringify(value, null, 2);
  return (
    <div className="relative">
      <ScrollArea className="max-h-50">
        <div className="rounded bg-muted p-2 pr-8">
          <JsonTreeView.Root defaultExpandedDepth={2} className={jsonTreeRoot} data={value}>
            <JsonTreeView.Tree className={jsonTree} arrow={<IconChevronRight size={12} />} />
          </JsonTreeView.Root>
        </div>
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
  );
}

type FunctionReferenceCardProps = {
  fn: ServiceFunctionRow;
  hideEndpoint?: boolean;
};

function isNonEmptyObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length > 0;
}

function isNonEmptyArray(v: unknown): v is unknown[] {
  return Array.isArray(v) && v.length > 0;
}

export function FunctionReferenceCard({
  fn,
  hideEndpoint = false,
}: FunctionReferenceCardProps) {
  const params = fn.parameter_schema ?? [];
  const tags = fn.tags ?? [];

  return (
    <div className="space-y-3">
      {/* ---- Endpoint (optional) ---- */}
      {!hideEndpoint && (
        <ApiSheetSection label="Endpoint">
          <div className="flex items-center gap-2">
            <Badge variant="blue" size="xs" className="shrink-0 uppercase">
              {fn.http_method}
            </Badge>
            <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 font-mono text-xs text-foreground">
              {fn.entrypoint}
            </code>
            <Clipboard.Root value={fn.entrypoint}>
              <Clipboard.Trigger
                className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                title="Copy endpoint URL"
              >
                <Clipboard.Indicator copied={<IconCheck size={12} className="text-primary" />}>
                  <IconCopy size={12} />
                </Clipboard.Indicator>
              </Clipboard.Trigger>
            </Clipboard.Root>
          </div>
        </ApiSheetSection>
      )}

      {/* ---- Content Type (rare, non-JSON only) ---- */}
      {fn.content_type && fn.content_type !== 'application/json' && (
        <ApiSheetSection label="Content Type">
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
            {fn.content_type}
          </code>
        </ApiSheetSection>
      )}

      {/* ---- Details ---- */}
      {fn.long_description && (
        <ApiSheetSection label="Details">
          <p className="max-w-[70ch] text-xs leading-relaxed text-foreground/70 whitespace-pre-line">
            {fn.long_description}
          </p>
        </ApiSheetSection>
      )}

      {/* ---- Compact metadata bar: Auth + Tags ---- */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 border-t border-border/30 pt-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Auth
          </span>
          {fn.auth_type && fn.auth_type !== 'none' ? (
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
              {fn.auth_type}
            </span>
          ) : (
            <span className="text-muted-foreground/50">Inherits</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Tags
          </span>
          {tags.length > 0 ? (
            tags.map((t) => (
              <Badge key={t} variant="gray" size="xs">
                {t}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground/40">-</span>
          )}
        </div>
      </div>

      {/* ---- Parameters ---- */}
      {params.length > 0 && (
        <ApiSheetSection label={`Parameters (${params.length})`}>
          <ParametersTable params={params} />
        </ApiSheetSection>
      )}

      {/* ---- JSON trees in balanced auto-fill grid ---- */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
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

        {isNonEmptyObject(fn.auth_config) && (
          <ApiSheetSection label="Auth Config">
            <JsonTreeBlock value={fn.auth_config} />
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
      </div>
    </div>
  );
}