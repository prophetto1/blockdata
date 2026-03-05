import { useCallback, useMemo, useRef, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { Clipboard } from '@ark-ui/react/clipboard';
import { JsonTreeView } from '@ark-ui/react/json-tree-view';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ServiceFunctionRow, ServiceRow } from './services-panel.types';
import {
  FunctionReferenceHeader,
  FunctionReferenceBody,
  jsonTreeRoot,
} from '@/components/services/function-reference';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

type ServiceDetailRailViewProps = {
  service: ServiceRow;
  functions: ServiceFunctionRow[];
  selectedFunctionId: string | null;
  onSelectFunction: (id: string | null) => void;
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
  selectedFunctionId,
  onSelectFunction: _onSelectFunction,
  savingKey,
  onSaveFunctionJson,
  isAdmin = true,
}: ServiceDetailRailViewProps) {
  const monacoTheme = useMonacoTheme();
  const selectedFn = useMemo(
    () => functions.find((f) => f.function_id === selectedFunctionId) ?? null,
    [functions, selectedFunctionId],
  );

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
  const baseUrl = service.base_url ?? '{{BLOCKDATA_API_BASE_URL}}';

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
              <JsonTreeView.Root defaultExpandedDepth={1} className={jsonTreeRoot} data={service.config}>
                <JsonTreeView.Tree className={configTree} arrow={<IconChevronRight size={10} />} />
              </JsonTreeView.Root>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/*  FUNCTION CONTENT (driven by sidebar selection)                   */}
      {/* ================================================================ */}

      {functions.length === 0 && (
        <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
          No functions registered.
        </div>
      )}

      {functions.length > 0 && !selectedFn && (
        <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
          Select a function from the sidebar.
        </div>
      )}

      {selectedFn && (
        <div className="border-t border-border/50 pt-3">
          {/* Shared function header + body */}
          <FunctionReferenceHeader fn={selectedFn} baseUrl={baseUrl} />
          <FunctionReferenceBody fn={selectedFn} />

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
      </ScrollArea>
    </div>
  );
}
