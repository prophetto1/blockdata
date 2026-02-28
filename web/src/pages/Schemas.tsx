import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import MonacoEditor, { type OnMount } from '@monaco-editor/react';

import { Select, createListCollection } from '@ark-ui/react/select';
import { Splitter } from '@ark-ui/react/splitter';
import { TreeView, createTreeCollection, type TreeNode } from '@ark-ui/react/tree-view';
import {
  IconAsterisk,
  IconBrackets,
  IconCheck,
  IconChevronRight,
  IconChevronDown,
  IconCode,
  IconDeviceFloppy,
  IconEye,
  IconLayoutColumns,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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
type SchemaRailTreeNode = TreeNode & {
  id: string;
  label: string;
  icon?: Icon;
  path?: string;
  children?: SchemaRailTreeNode[];
};

type MonacoEditorInstance = Parameters<OnMount>[0];

const SCHEMA_TYPE_OPTIONS: SchemaTypeOption[] = [
  { value: 'string', label: 'string' },
  { value: 'number', label: 'number' },
  { value: 'integer', label: 'integer' },
  { value: 'boolean', label: 'boolean' },
  { value: 'object', label: 'object' },
  { value: 'enum', label: 'enum' },
];

const SCHEMA_RAIL_ITEMS: SchemaRailTreeNode[] = [
  { id: 'schemas-editor', label: 'Editor', icon: IconCode, path: '/app/schemas' },
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

export default function Schemas() {
  useShellHeaderTitle({
    title: 'Schema',
    subtitle: 'OpenAPI schema editor',
  });
  const location = useLocation();
  const navigate = useNavigate();
  const monacoTheme = useMonacoTheme();
  const [extractSchemaReady, setExtractSchemaReady] = useState(true);
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
  const schemaRailCollection = useMemo(
    () =>
      createTreeCollection<SchemaRailTreeNode>({
        rootNode: {
          id: 'root',
          label: 'Root',
          children: SCHEMA_RAIL_ITEMS,
        },
        nodeToValue: (node) => node.id,
        nodeToString: (node) => node.label,
        nodeToChildren: (node) => node.children ?? [],
      }),
    [],
  );
  const activeSchemaRailId = useMemo(
    () => SCHEMA_RAIL_ITEMS.find((node) => node.path && location.pathname.startsWith(node.path))?.id ?? null,
    [location.pathname],
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
    setExtractSchemaReady(true);
    setExtractSchemaFields([createSchemaField({ type: 'string' })]);
  }, [createSchemaField]);

  const initializeAutoSchema = useCallback(() => {
    setExtractSchemaReady(true);
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

  const iconBtnClass = 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full';
  const iconActiveClass = 'bg-accent text-foreground';
  const iconInactiveClass = 'text-muted-foreground hover:text-foreground';

  function renderFieldRows(fields: SchemaField[], depth = 0): React.ReactNode {
    return fields.map((field) => (
      <div
        key={field.id}
        style={{ marginLeft: `${depth * 14}px` }}
      >
        <span className="text-xs font-medium text-muted-foreground">Property</span>
        <div className="mt-1 flex items-center gap-2">
          <Input
            value={field.name}
            placeholder=""
            className="h-9 min-w-0 flex-1 text-sm"
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
              <Select.Trigger className="flex h-9 w-32 items-center justify-between rounded-md border border-input bg-background px-3 text-sm">
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
          <div className="mt-1.5 ml-0.5 space-y-1 border-l-2 border-border/40 pl-3">
            {field.enumValues.map((value, index) => (
              <div key={`${field.id}-enum-${index}`} className="flex items-center gap-2">
                <Input
                  value={value}
                  placeholder="Enum value"
                  className="h-9 text-sm"
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
          <div className="mt-1.5 ml-0.5 space-y-0 border-l-2 border-border/40 pl-3">
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
    <div data-testid="schema-visual-panel" className="h-full min-h-0 overflow-auto p-3">
      {extractSchemaFields.length > 0 ? (
        <div className="space-y-3">
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
    <div data-testid="schema-code-panel" className="h-full min-h-0 p-3">
      <div className="h-full overflow-hidden rounded-md border border-border/70 bg-background">
        <MonacoEditor
          language="json"
          theme={monacoTheme}
          defaultValue={extractSchemaPreviewJson}
          onMount={(editor) => {
            editorRef.current = editor;
            editor.onDidFocusEditorText(() => { codeHasFocusRef.current = true; });
            editor.onDidBlurEditorText(() => {
              codeHasFocusRef.current = false;
              try {
                const parsed = JSON.parse(editor.getValue());
                if (parsed?.type === 'object') {
                  setExtractSchemaFields(parseObjectSchemaToFields(parsed));
                }
              } catch { /* invalid JSON — user still editing */ }
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
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-var(--app-shell-header-height))] overflow-hidden">
      <aside className="w-[250px] shrink-0 overflow-y-auto border-r border-border bg-card">
        <div className="px-4 pb-2 pt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Schema
          </h2>
        </div>

        <TreeView.Root
          collection={schemaRailCollection}
          selectionMode="single"
          selectedValue={activeSchemaRailId ? [activeSchemaRailId] : []}
          onSelectionChange={(details) => {
            const nextId = details.selectedValue[0];
            if (!nextId) return;
            const node = schemaRailCollection.findNode(nextId);
            if (node?.path) navigate(node.path);
          }}
        >
          <TreeView.Tree className="px-2 pb-4">
            <TreeView.Context>
              {(tree) =>
                tree.getVisibleNodes().map((entry) => {
                  const node = entry.node as SchemaRailTreeNode;
                  const indexPath = entry.indexPath;
                  if (node.id === 'root') return null;

                  return (
                    <TreeView.NodeProvider key={node.id} node={node} indexPath={indexPath}>
                      <TreeView.NodeContext>
                        {(state) => {
                          const depth = Math.max(0, indexPath.length - 1);
                          const paddingLeft = `${8 + depth * 16}px`;
                          const Icon = node.icon;
                          const isSelected = Boolean(state.selected);

                          if (state.isBranch) {
                            return (
                              <TreeView.Branch>
                                <TreeView.BranchControl
                                  className={cn(
                                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                                    'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                                    isSelected && 'bg-accent text-accent-foreground',
                                  )}
                                  style={{ paddingLeft }}
                                >
                                  <TreeView.BranchIndicator className="text-muted-foreground">
                                    <IconChevronRight size={14} className="transition-transform duration-150 data-[state=open]:rotate-90" />
                                  </TreeView.BranchIndicator>
                                  {Icon && <Icon size={16} />}
                                  <TreeView.BranchText className="truncate font-medium">
                                    {node.label}
                                  </TreeView.BranchText>
                                </TreeView.BranchControl>
                                <TreeView.BranchContent />
                              </TreeView.Branch>
                            );
                          }

                          return (
                            <TreeView.Item
                              className={cn(
                                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                                isSelected
                                  ? 'bg-primary/10 text-foreground font-medium'
                                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                              )}
                              style={{ paddingLeft }}
                            >
                              {Icon && <Icon size={16} />}
                              <TreeView.ItemText className="truncate">
                                {node.label}
                              </TreeView.ItemText>
                            </TreeView.Item>
                          );
                        }}
                      </TreeView.NodeContext>
                    </TreeView.NodeProvider>
                  );
                })
              }
            </TreeView.Context>
          </TreeView.Tree>
        </TreeView.Root>
      </aside>

      <section className="min-w-0 flex-1 overflow-hidden p-3">
        <div className="flex h-full min-h-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-2">
            <div role="toolbar" aria-label="Schema view options" className="flex items-center gap-1">
              <button
                type="button"
                aria-pressed={editorView === 'visual'}
                onClick={() => setEditorView('visual')}
                style={{ fontSize: '12px', fontWeight: 500, lineHeight: '16px' }}
                className={`inline-flex h-7 items-center gap-1.5 rounded border px-2 ${viewButtonClass(editorView === 'visual')}`}
              >
                <IconEye size={14} />
                Visual
              </button>
              <button
                type="button"
                aria-pressed={editorView === 'split'}
                onClick={() => setEditorView('split')}
                style={{ fontSize: '12px', fontWeight: 500, lineHeight: '16px' }}
                className={`inline-flex h-7 items-center gap-1.5 rounded border px-2 ${viewButtonClass(editorView === 'split')}`}
              >
                <IconLayoutColumns size={14} />
                Split
              </button>
              <button
                type="button"
                aria-pressed={editorView === 'code'}
                onClick={() => setEditorView('code')}
                style={{ fontSize: '12px', fontWeight: 500, lineHeight: '16px' }}
                className={`inline-flex h-7 items-center gap-1.5 rounded border px-2 ${viewButtonClass(editorView === 'code')}`}
              >
                <IconCode size={14} />
                Code
              </button>
            </div>

            {extractSchemaReady && (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
                  onClick={() => {
                    setExtractSchemaReady(false);
                    setExtractSchemaFields([]);
                  }}
                >
                  <IconRefresh size={14} />
                  Reset
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs"
                  onClick={() => {
                    // TODO: persist schema to backend
                    console.log('Save schema:', extractSchemaPreviewJson);
                  }}
                >
                  <IconDeviceFloppy size={14} />
                  Save
                </Button>
              </div>
            )}

          </div>

          {!extractSchemaReady && (
            <div className="flex min-h-0 flex-1 items-center justify-center rounded-md border border-border bg-card p-6">
              <div className="flex max-w-[560px] flex-col items-center gap-3 text-center">
                <h2 className="text-xl font-semibold text-foreground">Create Schema</h2>
                <p className="text-sm text-muted-foreground">
                  Start manually or bootstrap with a generated example.
                </p>
                <div className="flex items-center gap-2">
                  <Button type="button" onClick={initializeAutoSchema}>Auto-Generate</Button>
                  <Button type="button" variant="outline" onClick={initializeManualSchema}>Create Manually</Button>
                </div>
              </div>
            </div>
          )}

          {extractSchemaReady && editorView !== 'split' && (
            <div className="flex min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-background">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <div className="grid min-h-8 grid-cols-[1fr] border-b border-border bg-card">
                  <div className="inline-flex min-h-8 items-center px-2 text-xs font-medium text-muted-foreground">
                    {editorView === 'visual' ? 'Visual' : 'Code'}
                  </div>
                </div>
                {editorView === 'visual' ? visualPaneContent : codePaneContent}
              </div>
            </div>
          )}

          {extractSchemaReady && editorView === 'split' && (
            <Splitter.Root
              className="flex min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-background"
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
                <div className="grid min-h-8 grid-cols-[1fr] border-b border-border bg-card">
                  <div className="inline-flex min-h-8 items-center px-2 text-xs font-medium text-muted-foreground">
                    Visual
                  </div>
                </div>
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
                <div className="grid min-h-8 grid-cols-[1fr] border-b border-border bg-card">
                  <div className="inline-flex min-h-8 items-center px-2 text-xs font-medium text-muted-foreground">
                    Code
                  </div>
                </div>
                {codePaneContent}
              </Splitter.Panel>
            </Splitter.Root>
          )}
        </div>
      </section>
    </div>
  );
}
