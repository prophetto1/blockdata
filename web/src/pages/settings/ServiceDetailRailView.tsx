import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { Clipboard } from '@ark-ui/react/clipboard';
import { JsonTreeView } from '@ark-ui/react/json-tree-view';
import { Tabs } from '@ark-ui/react/tabs';
import {
  IconCheck,
  IconChevronRight,
  IconCode,
  IconCopy,
  IconDeviceFloppy,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { useMonacoTheme } from '@/hooks/useMonacoTheme';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ServiceFunctionRow, ServiceRow } from './services-panel.types';
import { FunctionReferenceCard } from './FunctionReferenceCard';
import { ScrollArea } from '@/components/ui/scroll-area';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

type ServiceDetailRailViewProps = {
  service: ServiceRow;
  functions: ServiceFunctionRow[];
  savingKey: string | null;
  onSaveFunctionJson: (fn: ServiceFunctionRow, json: Record<string, unknown>) => void;
  isAdmin?: boolean;
};

/* ------------------------------------------------------------------ */
/*  Health dot                                                         */
/* ------------------------------------------------------------------ */

function healthDotClass(status: string): string {
  switch (status) {
    case 'online':
      return 'bg-emerald-500';
    case 'degraded':
      return 'bg-amber-500';
    case 'offline':
      return 'bg-red-500';
    default:
      return 'bg-muted-foreground/40';
  }
}

/* ------------------------------------------------------------------ */
/*  Build JSON for Monaco editor                                       */
/* ------------------------------------------------------------------ */

const JSON_FIELD_ORDER = [
  'function_name', 'function_type', 'label', 'description', 'long_description',
  'http_method', 'entrypoint', 'content_type', 'enabled', 'deprecated', 'beta',
  'tags', 'source_task_class', 'plugin_group', 'when_to_use', 'provider_docs_url',
  'parameter_schema', 'result_schema', 'request_example', 'response_example',
  'examples', 'metrics', 'auth_type', 'auth_config',
] as const;

function buildFunctionJson(fn: ServiceFunctionRow): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const key of JSON_FIELD_ORDER) {
    obj[key] = fn[key as keyof ServiceFunctionRow] ?? null;
  }
  return obj;
}

/* ------------------------------------------------------------------ */
/*  Compact JSON tree for service config                               */
/* ------------------------------------------------------------------ */

const configTreeRoot = [
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

const configTree = [
  'flex flex-col text-[11px] leading-[1.7] font-mono',
  '[&_svg]:w-3 [&_svg]:h-3',
  '[&_[data-type=string]]:text-[var(--json-string)]',
  '[&_[data-type=number]]:text-[var(--json-number)]',
  '[&_[data-type=boolean]]:text-[var(--json-boolean)]',
  '[&_[data-kind=key]]:text-[var(--json-key)]',
  '[&_[data-kind=colon]]:text-muted-foreground/60 [&_[data-kind=colon]]:mx-0.5',
].join(' ');

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ServiceDetailRailView({
  service,
  functions,
  savingKey,
  onSaveFunctionJson,
  isAdmin = true,
}: ServiceDetailRailViewProps) {
  const monacoTheme = useMonacoTheme();
  const [selectedFnId, setSelectedFnId] = useState<string | null>(
    () => functions[0]?.function_id ?? null,
  );
  const selectedFn = useMemo(
    () => functions.find((f) => f.function_id === selectedFnId) ?? null,
    [functions, selectedFnId],
  );

  /* Keep selection valid when functions change (e.g. service switch) */
  useEffect(() => {
    if (functions.length === 0) {
      setSelectedFnId(null);
    } else if (!functions.some((f) => f.function_id === selectedFnId)) {
      setSelectedFnId(functions[0].function_id);
    }
  }, [functions, selectedFnId]);

  const [sourceOpen, setSourceOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const editorValueRef = useRef<string>('');

  /* ---- Handlers ---- */
  const handleSave = useCallback(() => {
    if (!selectedFn) return;
    try {
      const parsed = JSON.parse(editorValueRef.current);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setJsonError('JSON must be an object.');
        return;
      }
      setJsonError(null);
      onSaveFunctionJson(selectedFn, parsed as Record<string, unknown>);
      setEditing(false);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  }, [selectedFn, onSaveFunctionJson]);

  const fnJson = selectedFn ? buildFunctionJson(selectedFn) : null;
  const jsonStr = fnJson ? JSON.stringify(fnJson, null, 2) : '';
  const endpointTemplate = selectedFn
    ? `{{BLOCKDATA_API_BASE_URL}}${selectedFn.entrypoint}`
    : '{{BLOCKDATA_API_BASE_URL}}{entrypoint}';

  if (sourceOpen && !editing && jsonStr) {
    editorValueRef.current = jsonStr;
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <ScrollArea className="min-h-0 flex-1" viewportClass="px-5 pt-3 pb-6">
      {/* ================================================================ */}
      {/*  SERVICE HEADER                                                   */}
      {/* ================================================================ */}
      <div className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">
            {service.service_name}
          </h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  'inline-block h-2 w-2 rounded-full',
                  healthDotClass(service.health_status),
                )}
              />
            </TooltipTrigger>
            <TooltipContent className="px-2 py-1 text-xs">
              {service.health_status}
            </TooltipContent>
          </Tooltip>
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
            {service.service_type}
          </span>
          <span className={cn(
            'rounded px-1.5 py-0.5 text-[10px] font-medium',
            service.enabled
              ? 'bg-emerald-500/10 text-emerald-500'
              : 'bg-muted text-muted-foreground/50',
          )}>
            {service.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        {/* Base URL + Auth row */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Base URL
            </span>
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
              {'{{BLOCKDATA_API_BASE_URL}}'}
            </code>
            <Clipboard.Root value="{{BLOCKDATA_API_BASE_URL}}">
              <Clipboard.Trigger className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground">
                <Clipboard.Indicator copied={<IconCheck size={12} className="text-primary" />}>
                  <IconCopy size={12} />
                </Clipboard.Indicator>
              </Clipboard.Trigger>
            </Clipboard.Root>
          </div>
          {service.auth_type && service.auth_type !== 'none' && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Auth
              </span>
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{service.auth_type}</span>
            </div>
          )}
        </div>

        {/* Service description */}
        {service.description && (
          <p className="mt-1.5 max-w-[70ch] text-xs leading-snug text-foreground/70">
            {service.description}
          </p>
        )}

        {/* Service config */}
        {service.config && Object.keys(service.config).length > 0 && (
          <div className="mt-2 max-w-md">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Config ({Object.keys(service.config).length} keys)
            </span>
            <div className="mt-0.5 rounded bg-muted p-2">
              <JsonTreeView.Root defaultExpandedDepth={1} className={configTreeRoot} data={service.config}>
                <JsonTreeView.Tree className={configTree} arrow={<IconChevronRight size={10} />} />
              </JsonTreeView.Root>
            </div>
          </div>
        )}
      </div>

      {functions.length === 0 && (
        <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
          No functions registered.
        </div>
      )}

      {functions.length > 0 && (
        <Tabs.Root
          value={selectedFnId ?? undefined}
          onValueChange={(e) => setSelectedFnId(e.value)}
        >
          {/* ================================================================ */}
          {/*  FUNCTION TABS                                                    */}
          {/* ================================================================ */}
          <Tabs.List className="flex flex-wrap gap-1 border-t border-border/50 py-2">
            {functions.map((fn) => (
              <Tabs.Trigger
                key={fn.function_id}
                value={fn.function_id}
                className={cn(
                  'rounded px-2 py-1 text-xs transition-colors',
                  'data-selected:bg-primary/10 data-selected:text-primary data-selected:font-medium',
                  'bg-muted text-muted-foreground hover:text-foreground',
                  !fn.enabled && 'opacity-50',
                )}
              >
                {fn.function_name}
              </Tabs.Trigger>
            ))}
            <Tabs.Indicator />
          </Tabs.List>

          {/* ================================================================ */}
          {/*  FUNCTION CONTENT                                                */}
          {/* ================================================================ */}
          {!selectedFn && (
            <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
              Select a function above.
            </div>
          )}

        {selectedFn && (
          <div>
            {/* Function header — compact */}
            <div className="mb-2.5 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-mono text-sm font-semibold text-foreground">
                  {selectedFn.function_name}
                </h4>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {selectedFn.function_type}
                </span>
                {selectedFn.deprecated && (
                  <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                    Deprecated
                  </span>
                )}
                {selectedFn.beta && (
                  <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                    Beta
                  </span>
                )}
                {selectedFn.provider_docs_url && (
                  <a
                    href={selectedFn.provider_docs_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-primary hover:underline"
                  >
                    Provider docs
                  </a>
                )}
              </div>

              <div className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border/50 bg-muted/20 px-2 py-1 text-xs leading-tight">
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground uppercase">
                  {selectedFn.http_method}
                </span>
                <code className="max-w-[44rem] truncate font-mono text-xs text-foreground/90">
                  {selectedFn.entrypoint}
                </code>
                <Clipboard.Root value={endpointTemplate}>
                  <Clipboard.Trigger
                    className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                    title="Copy endpoint URL"
                  >
                    <Clipboard.Indicator copied={<IconCheck size={12} className="text-primary" />}>
                      <IconCopy size={12} />
                    </Clipboard.Indicator>
                  </Clipboard.Trigger>
                </Clipboard.Root>
              </div>

              {/* Description */}
              {selectedFn.description && (
                <p className="max-w-[70ch] text-xs leading-snug text-foreground/70">
                  {selectedFn.description}
                </p>
              )}

              {/* Compact metadata line: task class, group, when_to_use */}
              {(selectedFn.source_task_class || selectedFn.when_to_use) && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px]">
                  {selectedFn.source_task_class && (
                    <span className="inline-flex items-center gap-1">
                      <span className="font-semibold uppercase tracking-wider text-muted-foreground/60">Task Class</span>
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground/80">
                        {selectedFn.source_task_class}
                      </code>
                    </span>
                  )}
                  {selectedFn.plugin_group && (
                    <span className="inline-flex items-center gap-1">
                      <span className="font-semibold uppercase tracking-wider text-muted-foreground/60">Group</span>
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground/80">
                        {selectedFn.plugin_group}
                      </code>
                    </span>
                  )}
                </div>
              )}

              {/* When to use — inline hint */}
              {selectedFn.when_to_use && (
                <p className="max-w-[70ch] text-[11px] leading-snug text-foreground/50 italic">
                  {selectedFn.when_to_use}
                </p>
              )}
            </div>

            {/* Structured reference card */}
            <FunctionReferenceCard
              fn={selectedFn}
              hideEndpoint
            />

            {/* ---- Toolbar ---- */}
            <div className="mt-3 flex items-center gap-2 border-t border-border/50 pt-3">
              <button
                type="button"
                className={cn(
                  'inline-flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors',
                  sourceOpen
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground hover:text-foreground',
                )}
                onClick={() => {
                  if (sourceOpen) {
                    setSourceOpen(false);
                    setEditing(false);
                    setJsonError(null);
                  } else {
                    editorValueRef.current = jsonStr;
                    setSourceOpen(true);
                    setEditing(false);
                    setJsonError(null);
                  }
                }}
              >
                <IconCode size={13} />
                {sourceOpen ? 'Hide Source' : 'View Source'}
              </button>

              {sourceOpen && isAdmin && (
                <button
                  type="button"
                  className={cn(
                    'inline-flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors',
                    editing
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-muted text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => {
                    if (editing) {
                      setEditing(false);
                      setJsonError(null);
                    } else {
                      editorValueRef.current = jsonStr;
                      setEditing(true);
                      setJsonError(null);
                    }
                  }}
                >
                  {editing ? 'Cancel Edit' : 'Edit'}
                </button>
              )}

              {editing && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  onClick={handleSave}
                  disabled={savingKey === `function:${selectedFn.function_id}`}
                >
                  <IconDeviceFloppy size={13} />
                  {savingKey === `function:${selectedFn.function_id}` ? 'Saving...' : 'Save'}
                </button>
              )}

              <Clipboard.Root value={jsonStr}>
                <Clipboard.Trigger className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
                  <Clipboard.Indicator copied={<><IconCheck size={13} /> Copied</>}>
                    <><IconCopy size={13} /> Copy JSON</>
                  </Clipboard.Indicator>
                </Clipboard.Trigger>
              </Clipboard.Root>
            </div>

            {/* ---- Monaco (only when source open) ---- */}
            {sourceOpen && (
              <div className="mt-2 max-w-3xl">
                {jsonError && (
                  <div className="mb-2 rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-400">
                    {jsonError}
                  </div>
                )}
                <div
                  className={cn(
                    'overflow-hidden rounded-md border bg-background',
                    editing ? 'border-amber-500/40' : 'border-border/70',
                  )}
                >
                  <MonacoEditor
                    key={`${selectedFn.function_id}-${editing ? 'edit' : 'view'}`}
                    language="json"
                    theme={monacoTheme}
                    defaultValue={editing ? editorValueRef.current : jsonStr}
                    onChange={(value) => {
                      if (value !== undefined) editorValueRef.current = value;
                    }}
                    options={{
                      readOnly: !editing,
                      minimap: { enabled: false },
                      fontSize: 12,
                      lineHeight: 1.5,
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                      automaticLayout: true,
                      lineNumbers: editing ? 'on' : 'off',
                      folding: true,
                      renderLineHighlight: editing ? 'line' : 'none',
                      scrollbar: {
                        verticalScrollbarSize: 6,
                        horizontalScrollbarSize: 6,
                        useShadows: false,
                      },
                    }}
                    height={Math.min(
                      Math.max(jsonStr.split('\n').length * 19 + 16, 120),
                      500,
                    )}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Tabs.Root>
      )}
      </ScrollArea>
    </div>
  );
}
