import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import MonacoEditor, { type OnMount } from '@monaco-editor/react';

import { Select, createListCollection } from '@ark-ui/react/select';
import { Splitter } from '@ark-ui/react/splitter';
import {
  IconAsterisk,
  IconBrackets,
  IconBraces,
  IconCheck,
  IconChevronDown,
  IconCode,
  IconDeviceFloppy,
  IconEye,
  IconFileCode,
  IconLayoutColumns,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { Workbench, type WorkbenchTab } from '@/components/workbench/Workbench';
import { normalizePaneWidths, type Pane } from '@/components/workbench/workbenchState';
import {
  DialogRoot,
  DialogContent,
  DialogTitle,
  DialogCloseTrigger,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useProjectFocus } from '@/hooks/useProjectFocus';
import { useExtractionSchemas } from '@/hooks/useExtractionSchemas';
import type { ExtractionSchemaRow } from '@/lib/types';

type SchemaFieldType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'enum';

type SchemaField = {
  id: string;
  name: string;
  type: SchemaFieldType;
  required: boolean;
  isArray: boolean;
  enumValues: string[];
  children: SchemaField[];
};

type SchemaTypeOption = { value: SchemaFieldType; label: string };
type SchemaEditorView = 'visual' | 'split' | 'code';
type SchemaWorkspaceStage = 'start' | 'editing';

type MonacoEditorInstance = Parameters<OnMount>[0];

const SCHEMA_TYPE_OPTIONS: SchemaTypeOption[] = [
  { value: 'string', label: 'string' },
  { value: 'number', label: 'number' },
  { value: 'integer', label: 'integer' },
  { value: 'boolean', label: 'boolean' },
  { value: 'object', label: 'object' },
  { value: 'enum', label: 'enum' },
];

function subscribeTheme(onStoreChange: () => void): () => void {
  if (typeof document === 'undefined') return () => {};
  const observer = new MutationObserver(() => onStoreChange());
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

function getMonacoTheme(): string {
  if (typeof document === 'undefined') return 'vs-dark';
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'vs-dark';
}

function useMonacoTheme(): string {
  return useSyncExternalStore(subscribeTheme, getMonacoTheme, () => 'vs-dark');
}

function buildObjectSchema(fields: SchemaField[]): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const propertyOrdering: string[] = [];
  const required: string[] = [];

  fields.forEach((field) => {
    const propertyName = field.name.trim();
    if (!propertyName) return;

    let fieldSchema: Record<string, unknown>;

    if (field.type === 'object') {
      fieldSchema = buildObjectSchema(field.children);
    } else if (field.type === 'enum') {
      const enumValues = field.enumValues
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
      fieldSchema = {
        type: 'string',
        ...(enumValues.length > 0 ? { enum: enumValues } : {}),
      };
    } else {
      fieldSchema = { type: field.type };
    }

    const schemaNode = field.isArray
      ? { type: 'array', items: fieldSchema }
      : fieldSchema;

    properties[propertyName] = schemaNode;
    propertyOrdering.push(propertyName);
    if (field.required) required.push(propertyName);
  });

  return {
    type: 'object',
    properties,
    ...(propertyOrdering.length > 0 ? { propertyOrdering } : {}),
    ...(required.length > 0 ? { required } : {}),
  };
}

function parseObjectSchemaToFields(schema: Record<string, unknown>): SchemaField[] {
  const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
  if (!properties) return [];

  const requiredArr = Array.isArray(schema.required) ? (schema.required as string[]) : [];
  const requiredSet = new Set(requiredArr);
  const ordering = Array.isArray(schema.propertyOrdering)
    ? (schema.propertyOrdering as string[])
    : Object.keys(properties);

  return ordering
    .filter((name) => name in properties)
    .map((name) => {
      const prop = properties[name];
      const isArray = prop.type === 'array';
      const inner = isArray ? ((prop.items as Record<string, unknown>) ?? {}) : prop;

      let type: SchemaFieldType;
      let enumValues: string[] = [];
      let children: SchemaField[] = [];

      if (inner.type === 'object' || inner.properties) {
        type = 'object';
        children = parseObjectSchemaToFields(inner);
      } else if (Array.isArray(inner.enum)) {
        type = 'enum';
        enumValues = (inner.enum as unknown[]).map(String);
      } else {
        const rawType = inner.type as string;
        type = (['string', 'number', 'integer', 'boolean'].includes(rawType) ? rawType : 'string') as SchemaFieldType;
      }

      return {
        id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        type,
        required: requiredSet.has(name),
        isArray,
        enumValues,
        children,
      };
    });
}

export const SCHEMA_START_TITLE = 'Create Schema';
export const SCHEMA_START_DESCRIPTION = 'Start manually or bootstrap with a generated example.';
export const SCHEMA_START_ACTIONS = ['Auto-Generate', 'Create Manually'] as const;

export const SCHEMA_TABS: WorkbenchTab[] = [
  { id: 'schema-files', label: 'File List', icon: IconFileCode },
  { id: 'schema-library', label: 'User Schemas', icon: IconBraces },
  { id: 'schema-editor', label: 'Schema', icon: IconBraces },
  { id: 'schema-preview', label: 'Preview', icon: IconEye },
];

export const SCHEMA_DEFAULT_PANES: Pane[] = normalizePaneWidths([
  { id: 'pane-schema-left', tabs: ['schema-files', 'schema-library'], activeTab: 'schema-library', width: 28 },
  { id: 'pane-schema-editor', tabs: ['schema-editor'], activeTab: 'schema-editor', width: 50 },
  { id: 'pane-schema-right', tabs: ['schema-preview'], activeTab: 'schema-preview', width: 22 },
]);

function SchemaListPlaceholder({
  title,
  description,
  columns,
  footer,
}: {
  title: string;
  description: string;
  columns: string[];
  footer: string;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col p-1">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
        <div className="border-b border-border px-3 py-2.5">
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full table-fixed text-left text-[12px] leading-5">
            <thead className="sticky top-0 z-10 border-b border-border bg-card text-muted-foreground">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    className="px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.08em]"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-10 text-center text-sm text-muted-foreground"
                >
                  {description}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">{footer}</div>
      </div>
    </div>
  );
}

export default function Schemas() {
  useShellHeaderTitle({
    title: 'Schema',
  });
  const { resolvedProjectId } = useProjectFocus();
  const {
    schemas,
    loading: schemasLoading,
    createSchema: createSchemaRow,
    updateSchema: updateSchemaRow,
    deleteSchema: deleteSchemaRow,
  } = useExtractionSchemas(resolvedProjectId);

  const monacoTheme = useMonacoTheme();
  const [workspaceStage, setWorkspaceStage] = useState<SchemaWorkspaceStage>('start');
  const [schemaName, setSchemaName] = useState('');
  const [editingSchemaId, setEditingSchemaId] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [extractSchemaFields, setExtractSchemaFields] = useState<SchemaField[]>(() => [{
    id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    type: 'string' as SchemaFieldType,
    required: true,
    isArray: false,
    enumValues: [],
    children: [],
  }]);
  const [editorView, setEditorView] = useState<SchemaEditorView>('split');
  const [splitSize, setSplitSize] = useState<number[]>([50, 50]);
  const [codeError, setCodeError] = useState<string | null>(null);
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const codeHasFocusRef = useRef(false);

  const schemaTypeCollection = useMemo(
    () => createListCollection<SchemaTypeOption>({ items: SCHEMA_TYPE_OPTIONS }),
    [],
  );
  const splitterPanels = useMemo(
    () => [{ id: 'schema-visual', minSize: 20 }, { id: 'schema-code', minSize: 20 }],
    [],
  );
  const createSchemaField = useCallback((seed?: Partial<SchemaField>): SchemaField => (
    {
      id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: seed?.name ?? '',
      type: seed?.type ?? 'string',
      required: seed?.required ?? true,
      isArray: seed?.isArray ?? false,
      enumValues: seed?.enumValues ?? (seed?.type === 'enum' ? [''] : []),
      children: seed?.children ?? [],
    }
  ), []);

  const syncCodeToVisual = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    try {
      const parsed = JSON.parse(editor.getValue());
      if (parsed?.type === 'object') {
        setExtractSchemaFields(parseObjectSchemaToFields(parsed));
        setCodeError(null);
      }
    } catch {
      // keep current fields on invalid JSON
    }
  }, []);

  const switchEditorView = useCallback((next: SchemaEditorView) => {
    if (editorView !== 'visual' && editorRef.current) {
      syncCodeToVisual();
    }
    setEditorView(next);
  }, [editorView, syncCodeToVisual]);

  const handleSave = useCallback(async (): Promise<boolean> => {
    const name = schemaName.trim();
    if (!name || !resolvedProjectId) return false;
    setSaveBusy(true);
    try {
      syncCodeToVisual();
      const body = buildObjectSchema(extractSchemaFields);
      if (editingSchemaId) {
        await updateSchemaRow(editingSchemaId, { schema_name: name, schema_body: body });
      } else {
        const created = await createSchemaRow(name, body);
        setEditingSchemaId(created.schema_id);
      }
      return true;
    } catch (e) {
      console.error('Save failed:', e);
      return false;
    } finally {
      setSaveBusy(false);
    }
  }, [schemaName, resolvedProjectId, extractSchemaFields, editingSchemaId, createSchemaRow, updateSchemaRow, syncCodeToVisual]);

  const handleLoadSchema = useCallback((schema: ExtractionSchemaRow) => {
    setEditingSchemaId(schema.schema_id);
    setSchemaName(schema.schema_name);
    setExtractSchemaFields(parseObjectSchemaToFields(schema.schema_body));
    setWorkspaceStage('editing');
    setCodeError(null);
  }, []);

  const handleDeleteSchema = useCallback(async (schemaId: string) => {
    try {
      await deleteSchemaRow(schemaId);
      if (editingSchemaId === schemaId) {
        setEditingSchemaId(null);
        setSchemaName('');
        setWorkspaceStage('start');
        setExtractSchemaFields([]);
      }
    } catch (e) {
      console.error('Delete failed:', e);
    }
  }, [deleteSchemaRow, editingSchemaId]);

  const updateField = useCallback((targetId: string, updater: (field: SchemaField) => SchemaField) => {
    setExtractSchemaFields((prev) => {
      const visit = (input: SchemaField[]): SchemaField[] => (
        input.map((field) => {
          if (field.id === targetId) return updater(field);
          if (field.children.length === 0) return field;
          return { ...field, children: visit(field.children) };
        })
      );
      return visit(prev);
    });
  }, []);

  const removeField = useCallback((targetId: string) => {
    setExtractSchemaFields((prev) => {
      const removeFrom = (input: SchemaField[]): SchemaField[] => (
        input.flatMap((field) => {
          if (field.id === targetId) return [];
          if (field.children.length === 0) return [field];
          return [{ ...field, children: removeFrom(field.children) }];
        })
      );
      return removeFrom(prev);
    });
  }, []);

  const initializeManualSchema = useCallback(() => {
    setWorkspaceStage('editing');
    setEditorView('split');
    setExtractSchemaFields([createSchemaField({ type: 'string' })]);
  }, [createSchemaField]);

  const initializeAutoSchema = useCallback(() => {
    setWorkspaceStage('editing');
    setEditorView('split');
    setExtractSchemaFields([
      createSchemaField({ name: 'test', type: 'string', required: false }),
      createSchemaField({
        name: 'test111',
        type: 'object',
        required: true,
        children: [
          createSchemaField({ name: 'test222', type: 'boolean', required: false }),
          createSchemaField({
            name: 'test333',
            type: 'enum',
            required: true,
            enumValues: ['ttttt', 'ddddd', 'eeeee', 'ffff'],
          }),
          createSchemaField({ name: 'test444', type: 'string', required: true }),
          createSchemaField({ name: 'test55555', type: 'string', required: true }),
        ],
      }),
    ]);
  }, [createSchemaField]);

  const extractSchemaPreviewJson = useMemo(
    () => JSON.stringify(buildObjectSchema(extractSchemaFields), null, 2),
    [extractSchemaFields],
  );

  // Visual → Code sync: push JSON to Monaco when code pane isn't focused
  useEffect(() => {
    const editor = editorRef.current;
    if (editor && !codeHasFocusRef.current) {
      const current = editor.getValue();
      if (current !== extractSchemaPreviewJson) {
        editor.setValue(extractSchemaPreviewJson);
      }
    }
  }, [extractSchemaPreviewJson]);

  const iconBtnClass = 'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md';
  const iconActiveClass = 'bg-accent text-foreground';
  const iconInactiveClass = 'text-muted-foreground hover:text-foreground';

  function renderFieldRows(fields: SchemaField[], depth = 0): React.ReactNode {
    return fields.map((field) => (
      <div
        key={field.id}
        style={{ marginLeft: `${depth * 12}px` }}
      >
        <span className="text-xs font-medium text-muted-foreground">Property</span>
        <div className="mt-0.5 flex items-center gap-1.5">
          <Input
            value={field.name}
            placeholder="field_name"
            className="h-8 min-w-0 flex-1 text-sm"
            onChange={(event) => {
              const nextName = event.currentTarget.value;
              updateField(field.id, (current) => ({ ...current, name: nextName }));
            }}
          />

          <Select.Root
            collection={schemaTypeCollection}
            value={[field.type]}
            onValueChange={(details) => {
              const nextType = details.value[0] as SchemaFieldType | undefined;
              if (!nextType) return;
              updateField(field.id, (current) => {
                if (nextType === 'object') {
                  return { ...current, type: nextType, enumValues: [] };
                }
                if (nextType === 'enum') {
                  return {
                    ...current,
                    type: nextType,
                    children: [],
                    enumValues: current.enumValues.length > 0 ? current.enumValues : [''],
                  };
                }
                return { ...current, type: nextType, children: [], enumValues: [] };
              });
            }}
            positioning={{ placement: 'bottom-start', offset: { mainAxis: 4 }, strategy: 'fixed' }}
          >
            <Select.Control>
              <Select.Trigger className="flex h-8 w-28 items-center justify-between rounded-md border border-input bg-background px-2.5 text-sm">
                <Select.ValueText placeholder="type" className="truncate" />
                <Select.Indicator className="ml-2 shrink-0 text-muted-foreground">
                  <IconChevronDown size={14} />
                </Select.Indicator>
              </Select.Trigger>
            </Select.Control>
            <Select.Positioner className="z-50">
              <Select.Content className="min-w-40 max-h-72 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md">
                {schemaTypeCollection.items.map((item) => (
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
            onClick={() => updateField(field.id, (current) => ({ ...current, isArray: !current.isArray }))}
          >
            <IconBrackets size={18} />
          </button>

          <button
            type="button"
            className={cn(iconBtnClass, field.required ? iconActiveClass : iconInactiveClass)}
            title={field.required ? 'Required' : 'Optional'}
            onClick={() => updateField(field.id, (current) => ({ ...current, required: !current.required }))}
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

        {field.type === 'enum' && (
          <div className="mt-1 ml-0.5 space-y-0.5 border-l-2 border-border/40 pl-2.5">
            {field.enumValues.map((value, index) => (
              <div key={`${field.id}-enum-${index}`} className="flex items-center gap-1.5">
                <Input
                  value={value}
                  placeholder="Enum value"
                  className="h-7 text-xs"
                  onChange={(event) => {
                    const nextValue = event.currentTarget.value;
                    updateField(field.id, (current) => ({
                      ...current,
                      enumValues: current.enumValues.map((item, itemIndex) => (
                        itemIndex === index ? nextValue : item
                      )),
                    }));
                  }}
                />
                <button
                  type="button"
                  className={cn(iconBtnClass, iconInactiveClass)}
                  aria-label="Remove enum value"
                  onClick={() => {
                    updateField(field.id, (current) => ({
                      ...current,
                      enumValues: current.enumValues.filter((_, itemIndex) => itemIndex !== index),
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
              onClick={() => updateField(field.id, (current) => (
                { ...current, enumValues: [...current.enumValues, ''] }
              ))}
            >
              Add enum value
            </button>
          </div>
        )}

        {field.type === 'object' && (
          <div className="mt-1 ml-0.5 space-y-0 border-l-2 border-border/40 pl-2.5">
            {field.children.length > 0 ? (
              renderFieldRows(field.children, depth + 1)
            ) : (
              <p className="text-xs text-muted-foreground py-1">No nested properties yet.</p>
            )}
            <button
              type="button"
              className="text-xs font-medium text-muted-foreground hover:text-foreground py-1"
              onClick={() => updateField(field.id, (current) => (
                { ...current, children: [...current.children, createSchemaField({ type: 'string' })] }
              ))}
            >
              Add nested property
            </button>
          </div>
        )}
      </div>
    ));
  }

  const viewButtonClass = (active: boolean) => (
    active
      ? 'border-border bg-background text-foreground'
      : 'border-transparent text-muted-foreground hover:bg-background hover:text-foreground'
  );

  const visualPaneContent = (
    <div data-testid="schema-visual-panel" className="h-full min-h-0 overflow-auto p-2.5">
      {extractSchemaFields.length > 0 ? (
        <div className="space-y-2">
          {renderFieldRows(extractSchemaFields)}
          <button
            type="button"
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => setExtractSchemaFields((prev) => [...prev, createSchemaField({ type: 'string' })])}
          >
            Add property
          </button>
        </div>
      ) : (
        <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>No properties yet.</span>
          <button
            type="button"
            className="text-xs font-medium text-foreground hover:underline"
            onClick={() => setExtractSchemaFields((prev) => [...prev, createSchemaField({ type: 'string' })])}
          >
            Add your first property
          </button>
        </div>
      )}
    </div>
  );

  const codePaneContent = (
    <div data-testid="schema-code-panel" className="flex h-full min-h-0 flex-col p-2.5">
      <div className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border bg-background",
        codeError ? "border-destructive/50" : "border-border/70",
      )}>
        <div className="min-h-0 flex-1">
          <MonacoEditor
            language="json"
            theme={monacoTheme}
            defaultValue={extractSchemaPreviewJson}
            onMount={(editor) => {
              editorRef.current = editor;
              editor.onDidFocusEditorText(() => { codeHasFocusRef.current = true; setCodeError(null); });
              editor.onDidBlurEditorText(() => {
                codeHasFocusRef.current = false;
                try {
                  const parsed = JSON.parse(editor.getValue());
                  if (parsed?.type === 'object') {
                    setExtractSchemaFields(parseObjectSchemaToFields(parsed));
                    setCodeError(null);
                  }
                } catch (e) {
                  setCodeError(e instanceof SyntaxError ? e.message : 'Invalid JSON');
                }
              });
            }}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineHeight: 1.6,
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
        {codeError && (
          <div className="shrink-0 border-t border-destructive/30 bg-destructive/5 px-2 py-1 text-[11px] text-destructive truncate">
            {codeError}
          </div>
        )}
      </div>
    </div>
  );

  const schemaEditorContent = (
    <div className="flex h-full min-h-0 flex-col p-1">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
        {workspaceStage === 'start' && (
          <div className="flex min-h-0 flex-1 items-center justify-center p-6">
            <div className="flex max-w-[560px] flex-col items-center gap-3 text-center">
              <h2 className="text-xl font-semibold text-foreground">{SCHEMA_START_TITLE}</h2>
              <p className="text-sm text-muted-foreground">{SCHEMA_START_DESCRIPTION}</p>
              <div className="flex items-center gap-2">
                <Button type="button" onClick={initializeAutoSchema}>{SCHEMA_START_ACTIONS[0]}</Button>
                <Button type="button" variant="outline" onClick={initializeManualSchema}>{SCHEMA_START_ACTIONS[1]}</Button>
              </div>
            </div>
          </div>
        )}

        {workspaceStage === 'editing' && (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-2 py-1">
              <div role="toolbar" aria-label="Schema view options" className="flex items-center gap-1">
                <button
                  type="button"
                  aria-pressed={editorView === 'visual'}
                  onClick={() => switchEditorView('visual')}
                  className={`inline-flex h-8 items-center gap-1 rounded-md border px-2 text-[13px] font-semibold ${viewButtonClass(editorView === 'visual')}`}
                >
                  <IconEye size={15} />
                  Visual
                </button>
                <button
                  type="button"
                  aria-pressed={editorView === 'split'}
                  onClick={() => switchEditorView('split')}
                  className={`inline-flex h-8 items-center gap-1 rounded-md border px-2 text-[13px] font-semibold ${viewButtonClass(editorView === 'split')}`}
                >
                  <IconLayoutColumns size={15} />
                  Split
                </button>
                <button
                  type="button"
                  aria-pressed={editorView === 'code'}
                  onClick={() => switchEditorView('code')}
                  className={`inline-flex h-8 items-center gap-1 rounded-md border px-2 text-[13px] font-semibold ${viewButtonClass(editorView === 'code')}`}
                >
                  <IconCode size={15} />
                  Code
                </button>
              </div>

              <div className="ml-auto flex min-w-0 items-center gap-1.5">
                {editingSchemaId && schemaName && (
                  <span className="truncate text-sm font-medium text-foreground" title={schemaName}>
                    {schemaName}
                  </span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 px-2 text-[13px] font-semibold text-muted-foreground"
                  onClick={() => {
                    setWorkspaceStage('start');
                    setExtractSchemaFields([]);
                    setEditingSchemaId(null);
                    setSchemaName('');
                    setCodeError(null);
                  }}
                >
                  <IconRefresh size={15} />
                  Reset
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 gap-1 px-2 text-[13px] font-semibold"
                  disabled={saveBusy}
                  onClick={() => {
                    if (editingSchemaId && resolvedProjectId) {
                      void handleSave();
                    } else {
                      setSaveDialogOpen(true);
                    }
                  }}
                >
                  <IconDeviceFloppy size={15} />
                  {saveBusy ? 'Saving…' : editingSchemaId ? 'Update' : 'Save'}
                </Button>
              </div>
            </div>

            {editorView !== 'split' && (
              <div className="flex min-h-0 flex-1 overflow-hidden bg-background">
                {editorView === 'visual' ? visualPaneContent : codePaneContent}
              </div>
            )}

            {editorView === 'split' && (
              <Splitter.Root
                className="flex min-h-0 flex-1 overflow-hidden bg-background"
                orientation="horizontal"
                panels={splitterPanels}
                size={splitSize}
                onResize={({ size }) => {
                  if (
                    Array.isArray(size)
                    && size.length === 2
                    && Number.isFinite(size[0])
                    && Number.isFinite(size[1])
                  ) {
                    setSplitSize([size[0], size[1]]);
                  }
                }}
              >
                <Splitter.Panel id="schema-visual" className="flex min-h-0 min-w-0 flex-col">
                  {visualPaneContent}
                </Splitter.Panel>

                <Splitter.ResizeTrigger
                  id="schema-visual:schema-code"
                  className="relative w-1.5 cursor-col-resize bg-card"
                  aria-label="Resize schema panes"
                >
                  <Splitter.ResizeTriggerIndicator
                    id="schema-visual:schema-code"
                    className="absolute bottom-0 left-0.5 top-0 w-px bg-border"
                  />
                </Splitter.ResizeTrigger>

                <Splitter.Panel id="schema-code" className="flex min-h-0 min-w-0 flex-col">
                  {codePaneContent}
                </Splitter.Panel>
              </Splitter.Root>
            )}
          </>
        )}
      </div>
    </div>
  );

  const renderContent = useCallback((tabId: string) => {
    if (tabId === 'schema-files') {
      return (
        <SchemaListPlaceholder
          title="Files List"
          description="Source files for schema authoring will appear here."
          columns={['Name', 'Status', 'Schema']}
          footer="0 files"
        />
      );
    }

    if (tabId === 'schema-library') {
      return (
        <div className="flex h-full min-h-0 flex-col p-1">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
            <div className="border-b border-border px-3 py-2.5">
              <div className="text-sm font-semibold text-foreground">User Schemas</div>
              <p className="mt-1 text-xs text-muted-foreground">Saved extraction schemas for this project.</p>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {!resolvedProjectId ? (
                <div className="px-3 py-10 text-center text-sm text-muted-foreground">
                  Select a project to view schemas.
                </div>
              ) : schemasLoading ? (
                <div className="px-3 py-10 text-center text-sm text-muted-foreground">
                  Loading…
                </div>
              ) : schemas.length === 0 ? (
                <div className="px-3 py-10 text-center text-sm text-muted-foreground">
                  No schemas saved yet.
                </div>
              ) : (
                <table className="w-full table-fixed text-left text-[12px] leading-5">
                  <thead className="sticky top-0 z-10 border-b border-border bg-card text-muted-foreground">
                    <tr>
                      <th className="w-[45%] px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.08em]">Name</th>
                      <th className="px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.08em]">Fields</th>
                      <th className="px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.08em]">Updated</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {schemas.map((s) => {
                      const fieldCount = Object.keys(
                        (s.schema_body as Record<string, unknown>)?.properties ?? {},
                      ).length;
                      return (
                        <tr
                          key={s.schema_id}
                          onClick={() => handleLoadSchema(s)}
                          className={cn(
                            'cursor-pointer border-b border-border transition-colors hover:bg-accent/50',
                            editingSchemaId === s.schema_id && 'bg-accent/30',
                          )}
                        >
                          <td className="truncate px-2.5 py-1.5 font-medium text-foreground">{s.schema_name}</td>
                          <td className="px-2.5 py-1.5 text-muted-foreground">{fieldCount}</td>
                          <td className="px-2.5 py-1.5 text-muted-foreground">
                            {new Date(s.updated_at).toLocaleDateString()}
                          </td>
                          <td className="px-1 py-1">
                            <button
                              type="button"
                              className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-destructive"
                              title="Delete schema"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleDeleteSchema(s.schema_id);
                              }}
                            >
                              <IconTrash size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
              {schemas.length} saved schema{schemas.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>
      );
    }

    if (tabId === 'schema-editor') {
      return schemaEditorContent;
    }

    if (tabId === 'schema-preview') {
      return (
        <div className="flex h-full min-h-0 flex-col p-1">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
            <div className="border-b border-border px-3 py-2.5">
              <div className="text-sm font-semibold text-foreground">Reserved</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Placeholder panel for future schema-side previews and actions.
              </p>
            </div>
            <div className="flex min-h-0 flex-1 items-start justify-center p-4">
              <div className="w-full rounded-xl border border-primary/20 bg-primary/5 px-4 py-4">
                <div className="text-sm font-semibold text-foreground">Preview Placeholder</div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  The right column is reserved for now.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  }, [schemaEditorContent, resolvedProjectId, schemasLoading, schemas, editingSchemaId, handleLoadSchema, handleDeleteSchema]);

  return (
    <div className="h-full w-full min-h-0 p-2">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <Workbench
          tabs={SCHEMA_TABS}
          defaultPanes={SCHEMA_DEFAULT_PANES}
          saveKey="schema-builder-v1"
          renderContent={renderContent}
          className="schema-workbench"
          hideToolbar
          disableDrag
          lockLayout
          maxColumns={3}
        />
      </div>

      <DialogRoot open={saveDialogOpen} onOpenChange={(e) => { if (!e.open) setSaveDialogOpen(false); }}>
        <DialogContent>
          <DialogCloseTrigger />
          <DialogTitle>Save Schema As</DialogTitle>
          <DialogBody>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Schema name</label>
                <Input
                  value={schemaName}
                  onChange={(e) => setSchemaName(e.currentTarget.value)}
                  placeholder="e.g., Invoice Schema"
                  autoFocus
                />
              </div>
              {!resolvedProjectId && (
                <p className="text-xs text-destructive">Select a project first to save schemas.</p>
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={!schemaName.trim() || !resolvedProjectId || saveBusy}
              onClick={() => void handleSave().then((ok) => { if (ok) setSaveDialogOpen(false); })}
            >
              {saveBusy && <div className="mr-1.5 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </div>
  );
}
