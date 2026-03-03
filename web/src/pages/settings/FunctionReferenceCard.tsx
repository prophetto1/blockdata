import { Clipboard } from '@ark-ui/react/clipboard';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ParamDef, ServiceFunctionRow } from './services-panel.types';

/* ------------------------------------------------------------------ */
/*  ApiSheetSection — reusable section wrapper                         */
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
                  <span className="text-muted-foreground/40">—</span>
                )}
              </td>
              <td className="px-2 py-1 font-mono text-muted-foreground/70">
                {p.default !== undefined ? String(p.default) : '—'}
              </td>
              <td className="max-w-[200px] truncate px-2 py-1 text-muted-foreground/70">
                {p.values ? p.values.join(' | ') : '—'}
              </td>
              <td className="px-2 py-1 text-muted-foreground">
                {p.description ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  );
}

/* ------------------------------------------------------------------ */
/*  JsonBlock — pre-formatted JSON with copy button                    */
/* ------------------------------------------------------------------ */

function JsonBlock({ value }: { value: unknown }) {
  const text = JSON.stringify(value, null, 2);
  return (
    <div className="relative">
      <ScrollArea className="max-h-50">
        <pre className="rounded bg-muted p-2 pr-8 text-xs leading-relaxed">
          {text}
        </pre>
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

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

type FunctionReferenceCardProps = {
  fn: ServiceFunctionRow;
  hideEndpoint?: boolean;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function isNonEmptyObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length > 0;
}

function isNonEmptyArray(v: unknown): v is unknown[] {
  return Array.isArray(v) && v.length > 0;
}

/* ------------------------------------------------------------------ */
/*  FunctionReferenceCard                                              */
/* ------------------------------------------------------------------ */

export function FunctionReferenceCard({
  fn,
  hideEndpoint = false,
}: FunctionReferenceCardProps) {
  const params = fn.parameter_schema ?? [];
  const tags = fn.tags ?? [];

  return (
    <dl className="divide-y divide-border/30">
      {/* ---- Endpoint ---- */}
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

      {/* ---- Content Type ---- */}
      {fn.content_type && fn.content_type !== 'application/json' && (
        <ApiSheetSection label="Content Type">
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
            {fn.content_type}
          </code>
        </ApiSheetSection>
      )}

      {/* ---- Long Description ---- */}
      {fn.long_description && (
        <ApiSheetSection label="Details">
          <p className="max-w-[70ch] text-xs leading-relaxed text-foreground/70 whitespace-pre-line">
            {fn.long_description}
          </p>
        </ApiSheetSection>
      )}

      {/* ---- Parameters ---- */}
      <ApiSheetSection
        label={`Parameters${params.length > 0 ? ` (${params.length})` : ''}`}
        empty={params.length === 0}
      >
        <ParametersTable params={params} />
      </ApiSheetSection>

      {/* ---- Result Schema ---- */}
      <ApiSheetSection
        label="Result Schema"
        empty={!isNonEmptyObject(fn.result_schema)}
      >
        <JsonBlock value={fn.result_schema} />
      </ApiSheetSection>

      {/* ---- Request Example ---- */}
      <ApiSheetSection
        label="Request Example"
        empty={!isNonEmptyObject(fn.request_example)}
      >
        <JsonBlock value={fn.request_example} />
      </ApiSheetSection>

      {/* ---- Response Example ---- */}
      <ApiSheetSection
        label="Response Example"
        empty={!isNonEmptyObject(fn.response_example)}
      >
        <JsonBlock value={fn.response_example} />
      </ApiSheetSection>

      {/* ---- Examples array ---- */}
      {isNonEmptyArray(fn.examples) && (
        <ApiSheetSection label={`Examples (${fn.examples.length})`}>
          <JsonBlock value={fn.examples} />
        </ApiSheetSection>
      )}

      {/* ---- Authentication ---- */}
      <ApiSheetSection label="Authentication">
        {fn.auth_type && fn.auth_type !== 'none' ? (
          <div className="space-y-1">
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
              {fn.auth_type}
            </span>
            {isNonEmptyObject(fn.auth_config) && (
              <JsonBlock value={fn.auth_config} />
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/60">
            Inherits from service
          </span>
        )}
      </ApiSheetSection>

      {/* ---- Metadata row ---- */}
      <ApiSheetSection label="Metadata">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {tags.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <span className="text-muted-foreground/50">tags:</span>
              {tags.map((t) => (
                <Badge key={t} variant="gray" size="xs">
                  {t}
                </Badge>
              ))}
            </span>
          )}
          {tags.length === 0 && (
            <span className="text-muted-foreground/40">No tags</span>
          )}
        </div>
      </ApiSheetSection>

      {/* ---- Metrics ---- */}
      {isNonEmptyArray(fn.metrics) && (
        <ApiSheetSection label={`Metrics (${fn.metrics.length})`}>
          <JsonBlock value={fn.metrics} />
        </ApiSheetSection>
      )}
    </dl>
  );
}
