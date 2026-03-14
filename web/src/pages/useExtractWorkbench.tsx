import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MonacoEditor, { type OnMount } from '@monaco-editor/react';
import { Select, createListCollection } from '@ark-ui/react/select';
import {
  IconAsterisk,
  IconBrackets,
  IconBraces,
  IconCheck,
  IconChevronDown,
  IconCode,
  IconEye,
  IconFileCode,
  IconFileText,
  IconLayoutList,
  IconSettings,
  IconTrash,
} from '@tabler/icons-react';
import type { WorkbenchTab } from '@/components/workbench/Workbench';
import { normalizePaneWidths, type Pane } from '@/components/workbench/workbenchState';
import { useProjectDocuments } from '@/hooks/useProjectDocuments';
import { useProjectFocus } from '@/hooks/useProjectFocus';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DocumentFileTable } from '@/components/documents/DocumentFileTable';
import { DocumentPreviewFrame, DocumentPreviewMessage } from '@/components/documents/DocumentPreviewShell';
import { formatBytes, getDocumentFormat, type ProjectDocumentRow } from '@/lib/projectDetailHelpers';
import { cn } from '@/lib/utils';
import {
  type SchemaField,
  type SchemaFieldType,
  SCHEMA_TYPE_OPTIONS,
  createSchemaField,
  buildObjectSchema,
  parseObjectSchemaToFields,
  useMonacoTheme,
} from '@/lib/extractionSchemaHelpers';

// ---------------------------------------------------------------------------
// Shared layout primitives
// ---------------------------------------------------------------------------

function PanelFrame({ children }: { children: React.ReactNode }) {
  return (
    <DocumentPreviewFrame scroll padded={false}>
      <div className="space-y-4 px-4 py-4">{children}</div>
    </DocumentPreviewFrame>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <DocumentPreviewFrame>
      <DocumentPreviewMessage message={message} />
    </DocumentPreviewFrame>
  );
}

function SectionCard({
  title,
  children,
  tone = 'default',
}: {
  title: string;
  children: React.ReactNode;
  tone?: 'default' | 'accent';
}) {
  return (
    <section className={cn(
      'rounded-xl border px-4 py-4 shadow-sm',
      tone === 'accent' ? 'border-primary/25 bg-primary/5' : 'border-border bg-background/80',
    )}>
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Extract Config tab
// ---------------------------------------------------------------------------

function ExtractConfigTab({ doc }: { doc: ProjectDocumentRow | null }) {
  if (!doc) return <EmptyPanel message="Select a file to configure extraction." />;

  return (
    <PanelFrame>
      <SectionCard title="Document Context" tone="accent">
        <MetaRow label="File" value={doc.doc_title} />
        <MetaRow label="Format" value={getDocumentFormat(doc)} />
        <MetaRow label="Size" value={formatBytes(doc.source_filesize)} />
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Status</span>
          <Badge size="sm" variant={doc.status === 'parsed' ? 'green' : doc.status.includes('failed') ? 'red' : 'gray'}>
            {doc.status.replaceAll('_', ' ')}
          </Badge>
        </div>
      </SectionCard>

      <SectionCard title="Extraction Target">
        <p className="text-sm leading-6 text-muted-foreground">
          Extract uses the same selected-document flow as Parse, but configures structured outputs instead of parser settings.
        </p>
      </SectionCard>
    </PanelFrame>
  );
}

// ---------------------------------------------------------------------------
// Schema builder tab (visual / code toggle)
// ---------------------------------------------------------------------------

type MonacoEditorInstance = Parameters<OnMount>[0];
type SchemaEditorView = 'visual' | 'code';

function ExtractSchemaTab({ doc }: { doc: ProjectDocumentRow | null }) {
  const monacoTheme = useMonacoTheme();
  const [editorView, setEditorView] = useState<SchemaEditorView>('visual');
  const [fields, setFields] = useState<SchemaField[]>(() => [
    createSchemaField({ type: 'string' }),
  ]);
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const codeHasFocusRef = useRef(false);

  const schemaTypeCollection = useMemo(
    () => createListCollection({ items: SCHEMA_TYPE_OPTIONS }),
    [],
  );

  const schemaJson = useMemo(
    () => JSON.stringify(buildObjectSchema(fields), null, 2),
    [fields],
  );

  // Sync visual → code when code pane isn't focused
  useEffect(() => {
    const editor = editorRef.current;
    if (editor && !codeHasFocusRef.current) {
      const current = editor.getValue();
      if (current !== schemaJson) {
        editor.setValue(schemaJson);
      }
    }
  }, [schemaJson]);

  const updateField = useCallback((targetId: string, updater: (field: SchemaField) => SchemaField) => {
    setFields((prev) => {
      const visit = (input: SchemaField[]): SchemaField[] =>
        input.map((field) => {
          if (field.id === targetId) return updater(field);
          if (field.children.length === 0) return field;
          return { ...field, children: visit(field.children) };
        });
      return visit(prev);
    });
  }, []);

  const removeField = useCallback((targetId: string) => {
    setFields((prev) => {
      const removeFrom = (input: SchemaField[]): SchemaField[] =>
        input.flatMap((field) => {
          if (field.id === targetId) return [];
          if (field.children.length === 0) return [field];
          return [{ ...field, children: removeFrom(field.children) }];
        });
      return removeFrom(prev);
    });
  }, []);

  if (!doc) return <EmptyPanel message="Select a file to define the extraction schema." />;

  const iconBtnClass = 'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md';
  const iconActiveClass = 'bg-accent text-foreground';
  const iconInactiveClass = 'text-muted-foreground hover:text-foreground';

  const viewBtnClass = (active: boolean) =>
    active
      ? 'border-border bg-background text-foreground'
      : 'border-transparent text-muted-foreground hover:bg-background hover:text-foreground';

  function renderFieldRows(fieldList: SchemaField[], depth = 0): React.ReactNode {
    return fieldList.map((field) => (
      <div key={field.id} style={{ marginLeft: `${depth * 14}px` }}>
        <span className="text-xs font-medium text-muted-foreground">Property</span>
        <div className="mt-1 flex items-center gap-2">
          <Input
            value={field.name}
            placeholder=""
            className="h-9 min-w-0 flex-1 text-sm"
            onChange={(e) => {
              const nextName = e.currentTarget.value;
              updateField(field.id, (cur) => ({ ...cur, name: nextName }));
            }}
          />

          <Select.Root
            collection={schemaTypeCollection}
            value={[field.type]}
            onValueChange={(details) => {
              const nextType = details.value[0] as SchemaFieldType | undefined;
              if (!nextType) return;
              updateField(field.id, (cur) => {
                if (nextType === 'object') return { ...cur, type: nextType, enumValues: [] };
                if (nextType === 'enum') {
                  return { ...cur, type: nextType, children: [], enumValues: cur.enumValues.length > 0 ? cur.enumValues : [''] };
                }
                return { ...cur, type: nextType, children: [], enumValues: [] };
              });
            }}
            positioning={{ placement: 'bottom-start', offset: { mainAxis: 4 }, strategy: 'fixed' }}
          >
            <Select.Control>
              <Select.Trigger className="flex h-9 w-28 items-center justify-between rounded-md border border-input bg-background px-2 text-sm">
                <Select.ValueText placeholder="type" className="truncate" />
                <Select.Indicator className="ml-1 shrink-0 text-muted-foreground">
                  <IconChevronDown size={14} />
                </Select.Indicator>
              </Select.Trigger>
            </Select.Control>
            <Select.Positioner className="z-50">
              <Select.Content className="min-w-36 max-h-72 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md">
                {SCHEMA_TYPE_OPTIONS.map((item) => (
                  <Select.Item
                    key={item.value}
                    item={item}
                    className={cn(
                      'flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-sm',
                      'data-[state=checked]:bg-accent data-[state=checked]:font-medium',
                      'data-highlighted:bg-accent data-highlighted:outline-none',
                    )}
                  >
                    <Select.ItemText>{item.label}</Select.ItemText>
                    <Select.ItemIndicator><IconCheck size={14} /></Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
            <Select.HiddenSelect name={`schema-field-type-${field.id}`} />
          </Select.Root>

          <button
            type="button"
            className={cn(iconBtnClass, field.isArray ? iconActiveClass : iconInactiveClass)}
            title={field.isArray ? 'Array enabled' : 'Mark as array'}
            onClick={() => updateField(field.id, (cur) => ({ ...cur, isArray: !cur.isArray }))}
          >
            <IconBrackets size={18} />
          </button>

          <button
            type="button"
            className={cn(iconBtnClass, field.required ? iconActiveClass : iconInactiveClass)}
            title={field.required ? 'Required' : 'Optional'}
            onClick={() => updateField(field.id, (cur) => ({ ...cur, required: !cur.required }))}
          >
            <IconAsterisk size={18} />
          </button>

          <button
            type="button"
            className={cn(iconBtnClass, iconInactiveClass)}
            title="Delete property"
            onClick={() => removeField(field.id)}
          >
            <IconTrash size={18} />
          </button>
        </div>

        {/* Description field for extraction hint */}
        <div className="mt-1.5">
          <Input
            value={field.description}
            placeholder="Field description (extraction hint)"
            className="h-8 text-xs text-muted-foreground"
            onChange={(e) => {
              const desc = e.currentTarget.value;
              updateField(field.id, (cur) => ({ ...cur, description: desc }));
            }}
          />
        </div>

        {field.type === 'enum' && (
          <div className="mt-1.5 ml-0.5 space-y-1 border-l-2 border-border/40 pl-3">
            {field.enumValues.map((value, index) => (
              <div key={`${field.id}-enum-${index}`} className="flex items-center gap-2">
                <Input
                  value={value}
                  placeholder="Enum value"
                  className="h-9 text-sm"
                  onChange={(e) => {
                    const nextValue = e.currentTarget.value;
                    updateField(field.id, (cur) => ({
                      ...cur,
                      enumValues: cur.enumValues.map((item, i) => (i === index ? nextValue : item)),
                    }));
                  }}
                />
                <button
                  type="button"
                  className={cn(iconBtnClass, iconInactiveClass)}
                  aria-label="Remove enum value"
                  onClick={() => {
                    updateField(field.id, (cur) => ({
                      ...cur,
                      enumValues: cur.enumValues.filter((_, i) => i !== index),
                    }));
                  }}
                >
                  <IconTrash size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => updateField(field.id, (cur) => ({ ...cur, enumValues: [...cur.enumValues, ''] }))}
            >
              Add enum value
            </button>
          </div>
        )}

        {field.type === 'object' && (
          <div className="mt-1.5 ml-0.5 space-y-0 border-l-2 border-border/40 pl-3">
            {field.children.length > 0 ? (
              renderFieldRows(field.children, depth + 1)
            ) : (
              <p className="text-xs text-muted-foreground py-1">No nested properties yet.</p>
            )}
            <button
              type="button"
              className="text-xs font-medium text-muted-foreground hover:text-foreground py-1"
              onClick={() => updateField(field.id, (cur) => ({
                ...cur,
                children: [...cur.children, createSchemaField({ type: 'string' })],
              }))}
            >
              Add nested property
            </button>
          </div>
        )}
      </div>
    ));
  }

  return (
    <div className="flex h-full flex-col">
      {/* View toggle toolbar */}
      <div className="flex items-center gap-1 border-b border-border bg-card px-2 py-1.5">
        <button
          type="button"
          aria-pressed={editorView === 'visual'}
          onClick={() => setEditorView('visual')}
          className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2 text-xs font-semibold ${viewBtnClass(editorView === 'visual')}`}
        >
          <IconEye size={14} />
          Visual
        </button>
        <button
          type="button"
          aria-pressed={editorView === 'code'}
          onClick={() => setEditorView('code')}
          className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2 text-xs font-semibold ${viewBtnClass(editorView === 'code')}`}
        >
          <IconCode size={14} />
          Code
        </button>

        <div className="ml-auto">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            onClick={() => {
              // TODO: persist schema to extraction_schemas table
              console.log('Save schema:', schemaJson);
            }}
          >
            Save
          </Button>
        </div>
      </div>

      {/* Visual view */}
      {editorView === 'visual' && (
        <div className="min-h-0 flex-1 overflow-auto p-3">
          {fields.length > 0 ? (
            <div className="space-y-3">
              {renderFieldRows(fields)}
              <button
                type="button"
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setFields((prev) => [...prev, createSchemaField({ type: 'string' })])}
              >
                Add property
              </button>
            </div>
          ) : (
            <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>No properties yet.</span>
              <button
                type="button"
                className="text-xs font-medium text-foreground hover:underline"
                onClick={() => setFields((prev) => [...prev, createSchemaField({ type: 'string' })])}
              >
                Add your first property
              </button>
            </div>
          )}
        </div>
      )}

      {/* Code view */}
      {editorView === 'code' && (
        <div className="min-h-0 flex-1 p-2">
          <div className="h-full overflow-hidden rounded-md border border-border/70 bg-background">
            <MonacoEditor
              language="json"
              theme={monacoTheme}
              defaultValue={schemaJson}
              onMount={(editor) => {
                editorRef.current = editor;
                editor.onDidFocusEditorText(() => { codeHasFocusRef.current = true; });
                editor.onDidBlurEditorText(() => {
                  codeHasFocusRef.current = false;
                  try {
                    const parsed = JSON.parse(editor.getValue());
                    if (parsed?.type === 'object') {
                      setFields(parseObjectSchemaToFields(parsed));
                    }
                  } catch { /* invalid JSON — user still editing */ }
                });
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                lineHeight: 1.5,
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true,
                scrollbar: {
                  verticalScrollbarSize: 6,
                  horizontalScrollbarSize: 6,
                  useShadows: false,
                },
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results tab (placeholder until wired)
// ---------------------------------------------------------------------------

function ExtractResultsTab({ doc }: { doc: ProjectDocumentRow | null }) {
  if (!doc) return <EmptyPanel message="Select a file to view extraction results." />;

  return (
    <PanelFrame>
      <SectionCard title="Extraction Results" tone="accent">
        <p className="text-sm leading-6 text-muted-foreground">
          Run an extraction to see structured results for {doc.doc_title}.
        </p>
      </SectionCard>
    </PanelFrame>
  );
}

// ---------------------------------------------------------------------------
// Downloads tab
// ---------------------------------------------------------------------------

function ExtractDownloadsTab({ doc }: { doc: ProjectDocumentRow | null }) {
  if (!doc) return <EmptyPanel message="Select a file to view extract downloads." />;

  return (
    <PanelFrame>
      <SectionCard title="Downloads" tone="accent">
        <p className="text-sm leading-6 text-foreground">
          Downloadable extraction artifacts and raw result payloads for {doc.doc_title}.
        </p>
      </SectionCard>
      <SectionCard title="Selected File">
        <MetaRow label="File" value={doc.doc_title} />
        <MetaRow label="Format" value={getDocumentFormat(doc)} />
        <MetaRow label="Size" value={formatBytes(doc.source_filesize)} />
      </SectionCard>
    </PanelFrame>
  );
}

// ---------------------------------------------------------------------------
// Tabs, panes, and hook
// ---------------------------------------------------------------------------

export const EXTRACT_TABS: WorkbenchTab[] = [
  { id: 'extract-files', label: 'File List', icon: IconFileCode },
  { id: 'extract-config', label: 'Extract Config', icon: IconSettings },
  { id: 'extract-schema', label: 'Schema', icon: IconBraces },
  { id: 'extract-results', label: 'Results', icon: IconLayoutList },
  { id: 'extract-downloads', label: 'Downloads', icon: IconFileText },
];

export const EXTRACT_DEFAULT_PANES: Pane[] = normalizePaneWidths([
  { id: 'pane-extract-files', tabs: ['extract-files'], activeTab: 'extract-files', width: 32 },
  { id: 'pane-extract-config', tabs: ['extract-config', 'extract-schema'], activeTab: 'extract-config', width: 24 },
  { id: 'pane-extract-preview', tabs: ['extract-results', 'extract-downloads'], activeTab: 'extract-results', width: 44 },
]);

export function useExtractWorkbench() {
  useShellHeaderTitle({ title: 'Extract Documents' });
  const { resolvedProjectId } = useProjectFocus();
  const docState = useProjectDocuments(resolvedProjectId);
  const {
    docs,
    loading,
    error,
    selected,
    toggleSelect,
    toggleSelectAll,
    allSelected,
    someSelected,
  } = docState;

  const [activeDocUid, setActiveDocUid] = useState<string | null>(null);

  useEffect(() => {
    if (docs.length === 0) {
      setActiveDocUid(null);
      return;
    }
    const hasActive = activeDocUid != null && docs.some((doc) => doc.source_uid === activeDocUid);
    if (!hasActive) {
      setActiveDocUid(docs[0]?.source_uid ?? null);
    }
  }, [activeDocUid, docs]);

  const activeDoc = useMemo(
    () => docs.find((doc) => doc.source_uid === activeDocUid) ?? null,
    [docs, activeDocUid],
  );

  const handleDocClick = useCallback((doc: ProjectDocumentRow) => {
    setActiveDocUid(doc.source_uid);
  }, []);

  const renderContent = useCallback((tabId: string) => {
    if (tabId === 'extract-files') {
      return (
        <div className="flex h-full flex-col">
          <div className="min-h-0 flex-1 p-1">
            <div className="mx-auto flex h-full min-h-0 w-full max-w-[58rem] flex-col overflow-hidden rounded-md border border-border bg-card">
              <DocumentFileTable
                docs={docs}
                loading={loading}
                error={error}
                selected={selected}
                toggleSelect={toggleSelect}
                toggleSelectAll={toggleSelectAll}
                allSelected={allSelected}
                someSelected={someSelected}
                activeDoc={activeDocUid}
                onDocClick={handleDocClick}
                className={cn('parse-documents-table', 'parse-documents-table-compact')}
              />
            </div>
          </div>
        </div>
      );
    }

    if (tabId === 'extract-config') {
      return <ExtractConfigTab doc={activeDoc} />;
    }

    if (tabId === 'extract-schema') {
      return <ExtractSchemaTab doc={activeDoc} />;
    }

    if (tabId === 'extract-results') {
      return <ExtractResultsTab doc={activeDoc} />;
    }

    if (tabId === 'extract-downloads') {
      return <ExtractDownloadsTab doc={activeDoc} />;
    }

    return null;
  }, [activeDoc, activeDocUid, allSelected, docs, error, handleDocClick, loading, selected, someSelected, toggleSelect, toggleSelectAll]);

  return { renderContent };
}
