import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { Switch } from '@ark-ui/react/switch';
import {
  IconClipboard,
  IconCode,
  IconDeviceFloppy,
  IconX,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { useMonacoTheme } from '@/hooks/useMonacoTheme';
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
  notice?: { kind: 'success' | 'error'; message: string } | null;
  onDismissNotice?: () => void;
  onToggleFunctionEnabled: (fn: ServiceFunctionRow) => void;
  onSaveFunctionJson: (fn: ServiceFunctionRow, json: Record<string, unknown>) => void;
  isAdmin?: boolean;
};

/* ------------------------------------------------------------------ */
/*  Health badge                                                       */
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
  'function_name', 'function_type', 'label', 'description',
  'http_method', 'entrypoint', 'enabled', 'tags',
  'parameter_schema', 'result_schema',
] as const;

function buildFunctionJson(fn: ServiceFunctionRow): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const key of JSON_FIELD_ORDER) {
    obj[key] = fn[key as keyof ServiceFunctionRow] ?? null;
  }
  return obj;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ServiceDetailRailView({
  service,
  functions,
  savingKey,
  notice = null,
  onDismissNotice,
  onToggleFunctionEnabled,
  onSaveFunctionJson,
  isAdmin = true,
}: ServiceDetailRailViewProps) {
  const canonicalBaseUrl = '{{BLOCKDATA_API_BASE_URL}}';
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
  const [copiedBaseUrl, setCopiedBaseUrl] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const editorValueRef = useRef<string>('');

  /* ---- Derived service-level auth ---- */
  const authType = service.config
    ? (service.config.auth_type as string) ?? (service.config.auth as string) ?? null
    : null;
  const configKeys = service.config ? Object.keys(service.config) : [];

  /* ---- Handlers ---- */
  const handleCopyBaseUrl = useCallback(() => {
    void navigator.clipboard.writeText(canonicalBaseUrl).then(() => {
      setCopiedBaseUrl(true);
      setTimeout(() => setCopiedBaseUrl(false), 1500);
    });
  }, [canonicalBaseUrl]);

  const handleCopyEndpoint = useCallback((url: string) => {
    void navigator.clipboard.writeText(url).then(() => {
      setCopiedEndpoint(true);
      setTimeout(() => setCopiedEndpoint(false), 1500);
    });
  }, []);

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
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden pl-5">
      {/* ================================================================ */}
      {/*  SERVICE HEADER                                                   */}
      {/* ================================================================ */}
      <div className="shrink-0 pb-4 pt-1">
        {/* Service name + toggle + close */}
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">
            {service.service_name}
          </h2>
          <span
            className={cn(
              'inline-block h-2 w-2 rounded-full',
              healthDotClass(service.health_status),
            )}
            title={service.health_status}
          />
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
            {service.service_type}
          </span>

          {notice && (
            <div
              className={cn(
                'inline-flex min-w-0 max-w-[min(58vw,42rem)] items-center gap-1 rounded-md border px-2 py-1 text-xs',
                notice.kind === 'error'
                  ? 'border-destructive/40 bg-destructive/10 text-destructive'
                  : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
              )}
              role="status"
              aria-live="polite"
            >
              <span className="truncate">{notice.message}</span>
              <button
                type="button"
                onClick={onDismissNotice}
                className="rounded p-0.5 opacity-80 transition hover:opacity-100"
                aria-label="Dismiss notice"
              >
                <IconX size={12} />
              </button>
            </div>
          )}

        </div>

        {/* Base URL */}
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="text-muted-foreground/60">Base URL</span>
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
            {canonicalBaseUrl}
          </code>
          <button
            type="button"
            onClick={handleCopyBaseUrl}
            className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <IconClipboard size={12} />
          </button>
          {copiedBaseUrl && <span className="text-[10px] text-primary">Copied!</span>}
        </div>

        {/* Authentication */}
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-muted-foreground/60">Authentication</span>
          {authType ? (
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{authType}</span>
          ) : (
            <span className="italic text-muted-foreground/40">Not configured</span>
          )}
        </div>

        {/* Service Config */}
        {configKeys.length > 0 && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-muted-foreground transition-colors hover:text-foreground">
              Service Config ({configKeys.length} keys)
            </summary>
            <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted p-2 text-xs leading-relaxed">
              {JSON.stringify(service.config, null, 2)}
            </pre>
          </details>
        )}
      </div>

      {/* ================================================================ */}
      {/*  FUNCTION LIST                                                    */}
      {/* ================================================================ */}
      {functions.length > 0 && (
        <div className="shrink-0 border-t border-border/50 py-2">
          <div className="flex flex-wrap gap-1">
            {functions.map((fn) => (
              <button
                key={fn.function_id}
                type="button"
                onClick={() => setSelectedFnId(
                  selectedFnId === fn.function_id ? null : fn.function_id,
                )}
                className={cn(
                  'rounded px-2 py-1 text-xs transition-colors',
                  fn.function_id === selectedFnId
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'bg-muted text-muted-foreground hover:text-foreground',
                  !fn.enabled && 'opacity-50',
                )}
              >
                {fn.function_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/*  FUNCTION CONTENT (full width)                                   */}
      {/* ================================================================ */}
      <ScrollArea className="min-h-0 flex-1 border-t border-border/50" viewportClass="pt-4">
        {!selectedFn && (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            {functions.length === 0 ? 'No functions registered.' : 'Select a function above.'}
          </div>
        )}

        {selectedFn && (
          <div>
            {/* Function header */}
            <div className="mb-2.5 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-mono text-sm font-semibold text-foreground">
                  {selectedFn.function_name}
                </h4>
                {isAdmin && (
                  <div className="inline-flex items-center">
                    <Switch.Root
                      checked={selectedFn.enabled}
                      onCheckedChange={() => onToggleFunctionEnabled(selectedFn)}
                      disabled={savingKey === `function:${selectedFn.function_id}`}
                      className="inline-flex items-center"
                    >
                      <Switch.HiddenInput />
                      <Switch.Control className="relative h-4 w-8 rounded-full border border-input bg-muted transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary">
                        <Switch.Thumb className="block h-3 w-3 translate-x-0 rounded-full bg-background shadow transition-transform data-[state=checked]:translate-x-4" />
                      </Switch.Control>
                    </Switch.Root>
                  </div>
                )}
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {selectedFn.function_type}
                </span>
              </div>

              <div className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border/50 bg-muted/20 px-2 py-1 text-xs leading-tight">
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground uppercase">
                  {selectedFn.http_method}
                </span>
                <code className="max-w-[44rem] truncate font-mono text-xs text-foreground/90">
                  {selectedFn.entrypoint}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopyEndpoint(endpointTemplate)}
                  className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                  title="Copy endpoint URL"
                >
                  <IconClipboard size={12} />
                </button>
                {copiedEndpoint && <span className="text-[10px] text-primary">Copied!</span>}
              </div>

              {/* Description */}
              {selectedFn.description && (
                <p className="max-w-[70ch] text-xs leading-snug text-foreground/70">
                  {selectedFn.description}
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

              <button
                type="button"
                className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => void navigator.clipboard.writeText(jsonStr)}
              >
                <IconClipboard size={13} /> Copy JSON
              </button>
            </div>

            {/* ---- Monaco (only when source open) ---- */}
            {sourceOpen && (
              <div className="mt-2">
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
