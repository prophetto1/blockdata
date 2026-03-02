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
/*  Props                                                              */
/* ------------------------------------------------------------------ */

type FunctionReferenceCardProps = {
  fn: ServiceFunctionRow;
  hideEndpoint?: boolean;
};

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
        empty={!fn.result_schema || Object.keys(fn.result_schema).length === 0}
      >
        <ScrollArea className="max-h-50">
          <pre className="rounded bg-muted p-2 text-xs leading-relaxed">
            {JSON.stringify(fn.result_schema, null, 2)}
          </pre>
        </ScrollArea>
      </ApiSheetSection>

      {/* ---- Request Example (placeholder) ---- */}
      <ApiSheetSection label="Request Example" empty />

      {/* ---- Response Example (placeholder) ---- */}
      <ApiSheetSection label="Response Example" empty />

      {/* ---- Authentication ---- */}
      <ApiSheetSection label="Authentication">
        <span className="text-xs text-muted-foreground/60">
          Inherits from service
        </span>
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
    </dl>
  );
}
