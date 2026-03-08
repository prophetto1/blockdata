# Superuser Workspace — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a superuser-only admin dashboard at `/app/superuser` with a local-filesystem workspace (file tree + multi-format editor) as its first page, accessible via a gated button in the account card menu.

**Architecture:** A new route group `/app/superuser/*` gated by `useSuperuserProbe()`. The workspace page combines a File System Access API–backed file tree (Ark UI TreeView, reusing the pattern from `DocsSidebarFileTree.tsx`) with MDXEditor for `.md`/`.mdx` files and a standalone CodeMirror 6 editor for all other file types. Sandpack provides executable code block support inside MDXEditor. No Monaco — MDXEditor + CodeMirror handle everything. No preview pane — the editor surface is the workspace.

**Tech Stack:** React 19, React Router 7, Ark UI 5.x (TreeView, ScrollArea), MDXEditor 3.x (diffSourcePlugin, codeMirrorPlugin, sandpackPlugin, frontmatterPlugin, imagePlugin, toolbarPlugin), CodeMirror 6 (standalone for non-MD files), File System Access API (`window.showDirectoryPicker`), Tailwind 4, Supabase (superuser gating via `registry_superuser_profiles`).

---

## Phase 0 — Dependencies & Infrastructure

### Task 0.1: Install packages in `web/`

**Files:**
- Modify: `web/package.json`

**Step 1: Install MDXEditor, CodeMirror, and Sandpack**

```bash
cd web
npm install @mdxeditor/editor @codesandbox/sandpack-react @codemirror/lang-javascript @codemirror/lang-html @codemirror/lang-css @codemirror/lang-python @codemirror/lang-rust @codemirror/lang-go @codemirror/lang-yaml @codemirror/lang-json @codemirror/theme-one-dark
```

MDXEditor bundles its own CodeMirror for the code-block plugin, but we need standalone CodeMirror language packs for the non-MD editor surface.

**Step 2: Remove Monaco dependency**

Do NOT remove `@monaco-editor/react` yet — it is still used in other pages (`DocumentTest.tsx`, etc.). We simply do not use it in the new workspace. It can be removed in a future cleanup pass.

**Step 3: Commit**

```bash
git add web/package.json web/package-lock.json
git commit -m "deps: add mdxeditor, codemirror 6, sandpack to web app"
```

---

## Phase 1 — Superuser Route Gate & Account Menu Button

### Task 1.1: Create the superuser layout shell

**Files:**
- Create: `web/src/pages/superuser/SuperuserLayout.tsx`
- Create: `web/src/pages/superuser/SuperuserGuard.tsx`

**Step 1: Write SuperuserGuard**

This component wraps the superuser route group. It checks `useSuperuserProbe()` and redirects non-superusers.

```tsx
// web/src/pages/superuser/SuperuserGuard.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useSuperuserProbe } from '@/hooks/useSuperuserProbe';

export function SuperuserGuard() {
  const isSuperuser = useSuperuserProbe();

  // Still loading
  if (isSuperuser === null) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Verifying access…</div>;
  }

  if (!isSuperuser) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}
```

**Step 2: Write SuperuserLayout**

A minimal shell — full-bleed content area, no sidebar chrome (the workspace provides its own panels).

```tsx
// web/src/pages/superuser/SuperuserLayout.tsx
import { Outlet } from 'react-router-dom';

export function SuperuserLayout() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <Outlet />
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add web/src/pages/superuser/
git commit -m "feat: add superuser route guard and layout shell"
```

### Task 1.2: Register the route in the router

**Files:**
- Modify: `web/src/router.tsx`

**Step 1: Add lazy import and route**

Add inside the `AuthGuard` > `AppLayout` children array, after the settings block (~line 170):

```tsx
// Add import at top of file
import { SuperuserGuard } from '@/pages/superuser/SuperuserGuard';
import { SuperuserLayout } from '@/pages/superuser/SuperuserLayout';

// ... inside AppLayout children, after settings routes:

// Superuser dashboard (gated)
{
  path: '/app/superuser',
  element: <SuperuserGuard />,
  children: [
    {
      element: <SuperuserLayout />,
      children: [
        { index: true, lazy: () => import('@/pages/superuser/SuperuserWorkspace') },
      ],
    },
  ],
},
```

We use `lazy` for the workspace page because it pulls in MDXEditor + CodeMirror — a heavy bundle that only superusers need.

**Step 2: Create a placeholder page so the route resolves**

```tsx
// web/src/pages/superuser/SuperuserWorkspace.tsx
export function Component() {
  return <div className="p-8 text-muted-foreground">Workspace — coming soon</div>;
}
```

**Step 3: Verify the route works**

Run: `cd web && npm run dev`
Navigate to: `http://localhost:5274/app/superuser`
Expected: "Verifying access…" or redirect if not a superuser; "Workspace — coming soon" if you are.

**Step 4: Commit**

```bash
git add web/src/router.tsx web/src/pages/superuser/SuperuserWorkspace.tsx
git commit -m "feat: register /app/superuser route with lazy-loaded workspace"
```

### Task 1.3: Add superuser button to account card menu

**Files:**
- Modify: `web/src/components/shell/LeftRailShadcn.tsx`

**Step 1: Import the hook and icon**

Near the existing imports at top of the file, add:

```tsx
import { useSuperuserProbe } from '@/hooks/useSuperuserProbe';
import { IconShieldCog } from '@tabler/icons-react';
```

**Step 2: Pass superuser state into AccountMenuContent**

Modify the `AccountMenuContent` function signature to accept `isSuperuser`:

```tsx
function AccountMenuContent({
  userLabel,
  docsSiteUrl,
  isSuperuser,
  onNavigate,
  onNavigateSuperuser,
  onSignOut,
}: {
  userLabel?: string;
  docsSiteUrl: string;
  isSuperuser: boolean;
  onNavigate: () => void;
  onNavigateSuperuser: () => void;
  onSignOut?: () => void | Promise<void>;
}) {
```

**Step 3: Add the menu item — insert BEFORE the Docs item (line ~182)**

After the "Help" `MenuItem` and before the "Docs" `MenuItem`, add:

```tsx
{isSuperuser && (
  <MenuItem
    value="superuser"
    className="flex items-center justify-between px-3 py-2"
    onClick={onNavigateSuperuser}
  >
    <span>Superuser Tools</span>
    <IconShieldCog size={16} stroke={1.75} className="text-muted-foreground" />
  </MenuItem>
)}
```

**Step 4: Wire the props at the call site**

In the component that renders `<AccountMenuContent>` (the footer section ~line 544), call the hook and pass the new props:

```tsx
// Inside the parent component that renders AccountMenuContent, call the hook:
const isSuperuser = useSuperuserProbe();

// Then in the JSX:
<AccountMenuContent
  userLabel={userLabel}
  docsSiteUrl={docsSiteUrl}
  isSuperuser={isSuperuser === true}
  onNavigate={() => { navigate('/app/settings'); onNavigate?.(); }}
  onNavigateSuperuser={() => { navigate('/app/superuser'); onNavigate?.(); }}
  onSignOut={onSignOut}
/>
```

**Step 5: Verify**

- Log in as a superuser email → account menu shows "Superuser Tools" item
- Log in as a non-superuser → item does not appear
- Click "Superuser Tools" → navigates to `/app/superuser`

**Step 6: Commit**

```bash
git add web/src/components/shell/LeftRailShadcn.tsx
git commit -m "feat: add superuser tools button to account card menu"
```

---

## Phase 2 — File System Access + Ark UI File Tree

### Task 2.1: Create the file system access utilities

**Files:**
- Create: `web/src/lib/fs-access.ts`

This module wraps the File System Access API. It is adapted from the working pattern in `web-docs/src/lib/docs/local-file-handles.ts` and `DocsSidebarFileTree.tsx`, but generalized to handle ALL file types (not just `.md`/`.mdx`).

**Step 1: Write the module**

```ts
// web/src/lib/fs-access.ts

export type FsNode = {
  id: string;
  name: string;
  path: string;
  extension: string;
  kind: 'file' | 'directory';
  handle: FileSystemHandle;
  children?: FsNode[];
};

const IGNORED = new Set(['.git', 'node_modules', '.DS_Store', '__pycache__', '.next', 'dist', 'build']);

function getExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot).toLowerCase();
}

export async function readDirectory(
  dirHandle: FileSystemDirectoryHandle,
  parentPath = '',
): Promise<FsNode[]> {
  const entries: FsNode[] = [];

  for await (const [name, handle] of dirHandle.entries()) {
    if (name.startsWith('.') && name !== '.env.example') continue;
    if (IGNORED.has(name)) continue;

    const childPath = parentPath ? `${parentPath}/${name}` : name;

    if (handle.kind === 'directory') {
      const children = await readDirectory(handle as FileSystemDirectoryHandle, childPath);
      entries.push({
        id: `dir:${childPath}`,
        name,
        path: childPath,
        extension: '',
        kind: 'directory',
        handle,
        children,
      });
    } else {
      entries.push({
        id: `file:${childPath}`,
        name,
        path: childPath,
        extension: getExtension(name),
        kind: 'file',
        handle,
      });
    }
  }

  return entries.sort((a, b) => {
    if (a.kind === 'directory' && b.kind !== 'directory') return -1;
    if (a.kind !== 'directory' && b.kind === 'directory') return 1;
    return a.name.localeCompare(b.name);
  });
}

export async function readFileContent(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile();
  return file.text();
}

export async function writeFileContent(handle: FileSystemFileHandle, content: string): Promise<void> {
  const writable = await (handle as any).createWritable();
  await writable.write(content);
  await writable.close();
}

export async function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!('showDirectoryPicker' in window)) {
    throw new Error('File System Access API is not supported in this browser.');
  }
  return (window as any).showDirectoryPicker({ mode: 'readwrite' });
}
```

**Step 2: Write tests**

```ts
// web/src/lib/__tests__/fs-access.test.ts
import { describe, it, expect } from 'vitest';
// Since File System Access API is browser-only, we test the pure utility functions
// The async handle-based functions require browser integration tests

describe('fs-access module', () => {
  it('exports readDirectory, readFileContent, writeFileContent, pickDirectory', async () => {
    const mod = await import('../fs-access');
    expect(mod.readDirectory).toBeDefined();
    expect(mod.readFileContent).toBeDefined();
    expect(mod.writeFileContent).toBeDefined();
    expect(mod.pickDirectory).toBeDefined();
  });
});
```

**Step 3: Run test**

```bash
cd web && npx vitest run src/lib/__tests__/fs-access.test.ts
```

**Step 4: Commit**

```bash
git add web/src/lib/fs-access.ts web/src/lib/__tests__/fs-access.test.ts
git commit -m "feat: file system access utilities for local workspace"
```

### Task 2.2: Build the workspace file tree component

**Files:**
- Create: `web/src/pages/superuser/WorkspaceFileTree.tsx`

This reuses the exact Ark UI TreeView pattern from `web-docs/src/components/DocsSidebarFileTree.tsx` but without docs-specific concerns. It operates on `FsNode[]`.

**Step 1: Write the component**

```tsx
// web/src/pages/superuser/WorkspaceFileTree.tsx
import { ScrollArea } from '@ark-ui/react/scroll-area';
import { TreeView, createTreeCollection } from '@ark-ui/react/tree-view';
import {
  ChevronRight,
  File,
  FileCode2,
  FileText,
  FolderClosed,
  FolderOpen,
  FolderOpenDot,
  RefreshCw,
  X,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { type FsNode, pickDirectory, readDirectory } from '@/lib/fs-access';

const ICON_SIZE = 16;
const ICON_STROKE = 2;

const MD_EXTENSIONS = new Set(['.md', '.mdx']);
const CODE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.css', '.html',
  '.py', '.rs', '.go', '.json', '.yaml', '.yml',
  '.toml', '.sql', '.sh', '.bash',
]);

function fileIcon(ext: string) {
  if (MD_EXTENSIONS.has(ext)) return <FileText size={ICON_SIZE} strokeWidth={ICON_STROKE} />;
  if (CODE_EXTENSIONS.has(ext)) return <FileCode2 size={ICON_SIZE} strokeWidth={ICON_STROKE} />;
  return <File size={ICON_SIZE} strokeWidth={ICON_STROKE} />;
}

type Props = {
  onSelectFile: (node: FsNode) => void;
};

export function WorkspaceFileTree({ onSelectFile }: Props) {
  const [nodes, setNodes] = useState<FsNode[]>([]);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [error, setError] = useState('');

  const hasFolder = nodes.length > 0;

  const openFolder = useCallback(async () => {
    setError('');
    try {
      const handle = await pickDirectory();
      const children = await readDirectory(handle);
      setFolderName(handle.name);
      setNodes(children);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to open folder');
    }
  }, []);

  const closeFolder = useCallback(() => {
    setNodes([]);
    setFolderName(null);
  }, []);

  const rootNode = useMemo<FsNode>(
    () => ({
      id: 'dir:root',
      name: folderName || 'workspace',
      path: '',
      extension: '',
      kind: 'directory',
      handle: null!,
      children: nodes,
    }),
    [nodes, folderName],
  );

  const collection = useMemo(
    () =>
      createTreeCollection<FsNode>({
        nodeToValue: (node) => node.id,
        nodeToString: (node) => node.name,
        rootNode,
      }),
    [rootNode],
  );

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 p-4 text-sm text-muted-foreground">
        <span>{error}</span>
        <button type="button" className="text-primary underline" onClick={openFolder}>
          Try Again
        </button>
      </div>
    );
  }

  if (!hasFolder) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 text-sm text-muted-foreground">
        <FolderOpenDot size={24} strokeWidth={1.5} />
        <span>No folder open</span>
        <button
          type="button"
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          onClick={openFolder}
        >
          Open Folder
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <FolderOpen size={14} strokeWidth={ICON_STROKE} />
          <span className="truncate">{folderName}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded p-0.5 text-muted-foreground hover:bg-accent"
            onClick={openFolder}
            title="Switch folder"
          >
            <RefreshCw size={13} strokeWidth={ICON_STROKE} />
          </button>
          <button
            type="button"
            className="rounded p-0.5 text-muted-foreground hover:bg-accent"
            onClick={closeFolder}
            title="Close folder"
          >
            <X size={13} strokeWidth={ICON_STROKE} />
          </button>
        </div>
      </div>

      {/* Tree */}
      <ScrollArea.Root className="flex-1 overflow-hidden">
        <ScrollArea.Viewport className="h-full">
          <ScrollArea.Content>
            <TreeView.Root
              aria-label="Workspace file tree"
              collection={collection}
              selectionMode="single"
              expandOnClick
            >
              <TreeView.Tree>
                {collection.rootNode.children?.map((node, index) => (
                  <TreeNodeView key={node.id} node={node} indexPath={[index]} onSelect={onSelectFile} />
                ))}
              </TreeView.Tree>
            </TreeView.Root>
          </ScrollArea.Content>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical">
          <ScrollArea.Thumb />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
}

function TreeNodeView({
  node,
  indexPath,
  onSelect,
}: TreeView.NodeProviderProps<FsNode> & { onSelect: (node: FsNode) => void }) {
  if (node.kind === 'directory') {
    return (
      <TreeView.NodeProvider node={node} indexPath={indexPath}>
        <TreeView.Branch>
          <TreeView.BranchControl>
            <TreeView.BranchTrigger className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-sm hover:bg-accent">
              <TreeView.BranchIndicator className="transition-transform data-[state=open]:rotate-90">
                <ChevronRight size={14} strokeWidth={ICON_STROKE} />
              </TreeView.BranchIndicator>
              <TreeView.BranchText className="flex items-center gap-1.5">
                <FolderClosed size={ICON_SIZE} strokeWidth={ICON_STROKE} className="text-muted-foreground group-data-[state=open]:hidden" />
                <FolderOpen size={ICON_SIZE} strokeWidth={ICON_STROKE} className="text-muted-foreground hidden group-data-[state=open]:block" />
                <span className="truncate">{node.name}</span>
              </TreeView.BranchText>
            </TreeView.BranchTrigger>
          </TreeView.BranchControl>
          <TreeView.BranchContent className="pl-4">
            <TreeView.BranchIndentGuide />
            {(node.children ?? []).map((child, i) => (
              <TreeNodeView key={child.id} node={child} indexPath={[...indexPath, i]} onSelect={onSelect} />
            ))}
          </TreeView.BranchContent>
        </TreeView.Branch>
      </TreeView.NodeProvider>
    );
  }

  return (
    <TreeView.NodeProvider node={node} indexPath={indexPath}>
      <TreeView.Item>
        <button
          type="button"
          className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-sm hover:bg-accent"
          onClick={() => onSelect(node)}
        >
          <TreeView.ItemText className="flex items-center gap-1.5">
            {fileIcon(node.extension)}
            <span className="truncate">{node.name}</span>
          </TreeView.ItemText>
        </button>
      </TreeView.Item>
    </TreeView.NodeProvider>
  );
}
```

**Step 2: Commit**

```bash
git add web/src/pages/superuser/WorkspaceFileTree.tsx
git commit -m "feat: workspace file tree component using Ark UI TreeView"
```

---

## Phase 3 — Editor Surfaces

### Task 3.1: Create the MDXEditor wrapper for MD/MDX files

**Files:**
- Create: `web/src/pages/superuser/MdxEditorSurface.tsx`

This wraps MDXEditor with all relevant plugins: rich text, diff/source toggle, CodeMirror for code blocks, Sandpack for executable blocks, frontmatter, images, tables, lists, links.

**Step 1: Write the component**

```tsx
// web/src/pages/superuser/MdxEditorSurface.tsx
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  tablePlugin,
  frontmatterPlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  sandpackPlugin,
  diffSourcePlugin,
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  ListsToggle,
  BlockTypeSelect,
  InsertTable,
  InsertImage,
  CreateLink,
  InsertCodeBlock,
  InsertSandpack,
  DiffSourceToggleWrapper,
  UndoRedo,
  Separator,
  type SandpackConfig,
  type MDXEditorMethods,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { useRef, useEffect } from 'react';

const DEFAULT_SANDPACK_CONFIG: SandpackConfig = {
  defaultPreset: 'react',
  presets: [
    {
      label: 'React',
      name: 'react',
      meta: 'live react',
      sandpackTemplate: 'react',
      sandpackTheme: 'auto',
      snippetFileName: '/App.js',
      snippetLanguage: 'jsx',
    },
    {
      label: 'React (TS)',
      name: 'react-ts',
      meta: 'live react-ts',
      sandpackTemplate: 'react-ts',
      sandpackTheme: 'auto',
      snippetFileName: '/App.tsx',
      snippetLanguage: 'tsx',
    },
  ],
};

type Props = {
  content: string;
  onChange: (value: string) => void;
};

export function MdxEditorSurface({ content, onChange }: Props) {
  const editorRef = useRef<MDXEditorMethods>(null);

  useEffect(() => {
    editorRef.current?.setMarkdown(content);
  }, [content]);

  return (
    <MDXEditor
      ref={editorRef}
      markdown={content}
      onChange={onChange}
      className="h-full"
      contentEditableClassName="prose prose-sm max-w-none dark:prose-invert p-4"
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        markdownShortcutPlugin(),
        linkPlugin(),
        linkDialogPlugin(),
        imagePlugin(),
        tablePlugin(),
        frontmatterPlugin(),
        codeBlockPlugin({ defaultCodeBlockLanguage: 'ts' }),
        codeMirrorPlugin({
          codeBlockLanguages: {
            js: 'JavaScript',
            jsx: 'JSX',
            ts: 'TypeScript',
            tsx: 'TSX',
            css: 'CSS',
            html: 'HTML',
            python: 'Python',
            rust: 'Rust',
            go: 'Go',
            sql: 'SQL',
            bash: 'Bash',
            json: 'JSON',
            yaml: 'YAML',
          },
        }),
        sandpackPlugin({ sandpackConfig: DEFAULT_SANDPACK_CONFIG }),
        diffSourcePlugin({ viewMode: 'rich-text' }),
        toolbarPlugin({
          toolbarContents: () => (
            <DiffSourceToggleWrapper options={['rich-text', 'source', 'diff']}>
              <UndoRedo />
              <Separator />
              <BoldItalicUnderlineToggles />
              <Separator />
              <BlockTypeSelect />
              <Separator />
              <ListsToggle />
              <Separator />
              <CreateLink />
              <InsertImage />
              <InsertTable />
              <Separator />
              <InsertCodeBlock />
              <InsertSandpack />
            </DiffSourceToggleWrapper>
          ),
        }),
      ]}
    />
  );
}
```

**Step 2: Commit**

```bash
git add web/src/pages/superuser/MdxEditorSurface.tsx
git commit -m "feat: mdxeditor surface with full plugin suite and sandpack"
```

### Task 3.2: Create the CodeMirror editor for non-MD files

**Files:**
- Create: `web/src/pages/superuser/CodeEditorSurface.tsx`

Standalone CodeMirror 6 editor for `.js`, `.ts`, `.jsx`, `.tsx`, `.css`, `.html`, `.py`, `.rs`, `.go`, `.yaml`, `.json`, `.sql`, `.sh`, etc.

**Step 1: Write the component**

```tsx
// web/src/pages/superuser/CodeEditorSurface.tsx
import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { python } from '@codemirror/lang-python';
import { rust } from '@codemirror/lang-rust';
import { go } from '@codemirror/lang-go';
import { yaml } from '@codemirror/lang-yaml';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import { type Extension } from '@codemirror/state';

function getLanguageExtension(ext: string): Extension | null {
  switch (ext) {
    case '.js': return javascript();
    case '.jsx': return javascript({ jsx: true });
    case '.ts': return javascript({ typescript: true });
    case '.tsx': return javascript({ jsx: true, typescript: true });
    case '.html': return html();
    case '.css': return css();
    case '.py': return python();
    case '.rs': return rust();
    case '.go': return go();
    case '.yaml':
    case '.yml': return yaml();
    case '.json': return json();
    default: return null;
  }
}

type Props = {
  content: string;
  extension: string;
  onChange: (value: string) => void;
};

export function CodeEditorSurface({ content, extension, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const langExt = getLanguageExtension(extension);
    const extensions: Extension[] = [
      basicSetup,
      oneDark,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString());
        }
      }),
    ];
    if (langExt) extensions.push(langExt);

    const state = EditorState.create({ doc: content, extensions });
    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [extension]); // Recreate when file type changes

  // Update content without recreating the editor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== content) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: content },
      });
    }
  }, [content]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-auto [&_.cm-editor]:h-full [&_.cm-scroller]:overflow-auto"
    />
  );
}
```

**Step 2: Commit**

```bash
git add web/src/pages/superuser/CodeEditorSurface.tsx
git commit -m "feat: standalone codemirror 6 editor surface for code files"
```

---

## Phase 4 — Workspace Page Assembly

### Task 4.1: Build the full workspace page

**Files:**
- Modify: `web/src/pages/superuser/SuperuserWorkspace.tsx`

This replaces the placeholder. It composes the file tree on the left with the appropriate editor surface on the right.

**Step 1: Write the workspace**

```tsx
// web/src/pages/superuser/SuperuserWorkspace.tsx
import { useCallback, useState } from 'react';
import { type FsNode, readFileContent, writeFileContent } from '@/lib/fs-access';
import { WorkspaceFileTree } from './WorkspaceFileTree';
import { MdxEditorSurface } from './MdxEditorSurface';
import { CodeEditorSurface } from './CodeEditorSurface';

const MD_EXTENSIONS = new Set(['.md', '.mdx']);

type OpenFile = {
  node: FsNode;
  content: string;
  dirty: boolean;
};

export function Component() {
  const [openFile, setOpenFile] = useState<OpenFile | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSelectFile = useCallback(async (node: FsNode) => {
    if (node.kind !== 'file') return;
    try {
      const content = await readFileContent(node.handle as FileSystemFileHandle);
      setOpenFile({ node, content, dirty: false });
    } catch (err) {
      console.error('Failed to read file:', err);
    }
  }, []);

  const handleChange = useCallback((value: string) => {
    setOpenFile((prev) => prev ? { ...prev, content: value, dirty: true } : null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!openFile?.dirty) return;
    setSaving(true);
    try {
      await writeFileContent(openFile.node.handle as FileSystemFileHandle, openFile.content);
      setOpenFile((prev) => prev ? { ...prev, dirty: false } : null);
    } catch (err) {
      console.error('Failed to save file:', err);
    } finally {
      setSaving(false);
    }
  }, [openFile]);

  // Ctrl/Cmd+S to save
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        void handleSave();
      }
    },
    [handleSave],
  );

  const isMd = openFile && MD_EXTENSIONS.has(openFile.node.extension);

  return (
    <div className="flex h-full" onKeyDown={handleKeyDown}>
      {/* Left panel: file tree */}
      <div className="flex w-64 shrink-0 flex-col border-r bg-sidebar">
        <WorkspaceFileTree onSelectFile={handleSelectFile} />
      </div>

      {/* Right panel: editor */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {openFile ? (
          <>
            {/* File tab bar */}
            <div className="flex items-center justify-between border-b px-4 py-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{openFile.node.name}</span>
                {openFile.dirty && <span className="text-xs text-muted-foreground">(unsaved)</span>}
              </div>
              <button
                type="button"
                className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                onClick={() => void handleSave()}
                disabled={!openFile.dirty || saving}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>

            {/* Editor surface */}
            <div className="flex-1 overflow-hidden">
              {isMd ? (
                <MdxEditorSurface content={openFile.content} onChange={handleChange} />
              ) : (
                <CodeEditorSurface
                  content={openFile.content}
                  extension={openFile.node.extension}
                  onChange={handleChange}
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <span className="text-sm">Select a file to edit</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify end-to-end**

Run: `cd web && npm run dev`
Navigate to: `http://localhost:5274/app/superuser`
1. Click "Open Folder" → browser directory picker opens
2. Select a local project folder → file tree populates
3. Click a `.md` file → MDXEditor loads with toolbar, diff/source toggle, Sandpack insert
4. Click a `.ts` file → CodeMirror loads with syntax highlighting
5. Edit content → "(unsaved)" appears, Save button activates
6. Ctrl+S → saves back to disk via File System Access API

**Step 3: Commit**

```bash
git add web/src/pages/superuser/SuperuserWorkspace.tsx
git commit -m "feat: assemble superuser workspace with file tree + dual editor surfaces"
```

---

## Phase 5 — Styling & Polish

### Task 5.1: MDXEditor dark mode and theme alignment

**Files:**
- Create: `web/src/styles/mdxeditor-overrides.css`
- Modify: `web/src/pages/superuser/MdxEditorSurface.tsx` (import the CSS)

**Step 1: Write theme overrides**

```css
/* web/src/styles/mdxeditor-overrides.css */

/* Align MDXEditor chrome with app theme tokens */
.mdxeditor {
  --accentBase: var(--color-primary);
  --accentBgSubtle: var(--color-accent);
  --accentText: var(--color-primary);
  --baseBase: var(--color-background);
  --baseBgSubtle: var(--color-muted);
  --baseText: var(--color-foreground);
  --baseTextHighContrast: var(--color-foreground);
  --borderDefault: var(--color-border);
  font-family: var(--font-sans, inherit);
}

/* Toolbar alignment */
.mdxeditor [role='toolbar'] {
  border-color: var(--color-border);
  background: var(--color-card);
}

/* Dark mode — CodeMirror inside MDXEditor uses its own theming,
   but the wrapper chrome needs to match */
.dark .mdxeditor {
  --baseBase: var(--color-background);
  --baseBgSubtle: var(--color-muted);
  --baseText: var(--color-foreground);
  --borderDefault: var(--color-border);
}
```

**Step 2: Import in MdxEditorSurface.tsx**

Add to the imports:
```tsx
import '@/styles/mdxeditor-overrides.css';
```

**Step 3: Commit**

```bash
git add web/src/styles/mdxeditor-overrides.css web/src/pages/superuser/MdxEditorSurface.tsx
git commit -m "style: mdxeditor dark mode and theme token alignment"
```

### Task 5.2: CodeMirror theme respects app dark/light mode

**Files:**
- Modify: `web/src/pages/superuser/CodeEditorSurface.tsx`

**Step 1: Detect dark mode and conditionally apply theme**

Replace the static `oneDark` import with a dynamic check:

```tsx
// At top of file, add:
function isDarkMode(): boolean {
  return document.documentElement.classList.contains('dark');
}

// In the useEffect that creates the editor, replace:
//   oneDark,
// with:
...(isDarkMode() ? [oneDark] : []),
```

**Step 2: Commit**

```bash
git add web/src/pages/superuser/CodeEditorSurface.tsx
git commit -m "style: codemirror respects app dark/light mode"
```

---

## Phase 6 — Future Expansion Stubs

### Task 6.1: Add navigation tabs to SuperuserLayout for future pages

**Files:**
- Modify: `web/src/pages/superuser/SuperuserLayout.tsx`

**Step 1: Add a minimal tab bar**

```tsx
// web/src/pages/superuser/SuperuserLayout.tsx
import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';

const TABS = [
  { to: '/app/superuser', label: 'Workspace', end: true },
  // Future tabs:
  // { to: '/app/superuser/site-config', label: 'Site Config', end: false },
  // { to: '/app/superuser/docs-config', label: 'Docs Config', end: false },
] as const;

export function SuperuserLayout() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Tab bar — only shown when there are 2+ tabs */}
      {TABS.length > 1 && (
        <nav className="flex gap-1 border-b px-4 pt-2">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'border-b-2 px-3 pb-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      )}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
```

When you add a second tab, uncomment the entry in `TABS` and register the route in `router.tsx`.

**Step 2: Commit**

```bash
git add web/src/pages/superuser/SuperuserLayout.tsx
git commit -m "feat: superuser layout with expandable tab navigation"
```

---

## Dependency Map

```
Phase 0 (deps)
  └─ Phase 1 (route + menu button)
       └─ Phase 2 (file tree)
       └─ Phase 3 (editor surfaces)
            └─ Phase 4 (assembly)
                 └─ Phase 5 (styling)
                      └─ Phase 6 (future stubs)
```

Phases 2 and 3 are independent of each other and can be built in parallel.

---

## What This Plan Does NOT Include (Deferred)

- **Multi-tab editor** — currently single-file open. Multi-tab is a Phase 2 enhancement.
- **File CRUD in tree** — rename, delete, create file/folder. The File System Access API supports this but it adds complexity. Defer to next iteration.
- **Vendor docs mirror** — local snapshots of Ark UI, MDXEditor, Sandpack docs. Defer to a separate plan.
- **Monaco removal** — other pages still use it. Remove in a cleanup pass.
- **Site Config / Docs Config pages** — the layout supports tabs, but the pages themselves are future work.
