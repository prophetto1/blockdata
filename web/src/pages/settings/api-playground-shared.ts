/* ------------------------------------------------------------------ */
/*  API Playground — shared styles, constants, and helpers              */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  JSON tree styles (single source for all JsonTreeView instances)     */
/* ------------------------------------------------------------------ */

export const jsonTreeRootClass = [
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

export const jsonTreeClass = [
  'flex flex-col text-[11px] leading-[1.7] font-mono',
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
/*  JSON field order for Monaco editor                                  */
/* ------------------------------------------------------------------ */

export const FUNCTION_JSON_FIELD_ORDER = [
  'function_name', 'function_type', 'label', 'description', 'long_description',
  'http_method', 'entrypoint', 'content_type', 'enabled', 'deprecated', 'beta',
  'tags', 'source_task_class', 'plugin_group', 'when_to_use', 'provider_docs_url',
  'parameter_schema', 'result_schema', 'request_example', 'response_example',
  'examples', 'metrics', 'auth_type', 'auth_config',
] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

export function relativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return iso;
  if (ms < 60_000) return 'Just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

export function isNonEmptyObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length > 0;
}

export function isNonEmptyArray(v: unknown): v is unknown[] {
  return Array.isArray(v) && v.length > 0;
}