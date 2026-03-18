# Assets Default Route & Code File Preview Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix two gaps in the Assets surface — (1) new/empty projects should land on Assets instead of ELT, and (2) all text-based files should preview like VS Code: read-only, with syntax highlighting when a language pack exists.

**Architecture:** Issue 1 is a routing change in two places. Issue 2 adds a read-only `CodePreview` component (CodeMirror) that catches code/data files currently showing "Open file". All existing renderers (PDF, Image, JSON tree, Markdown, plain text, DOCX, PPTX) are untouched — CodePreview is additive only, inserted before the fallback.

**Tech Stack:** React, react-router, CodeMirror 6 (already installed: `codemirror`, `@codemirror/lang-*`, `@codemirror/theme-one-dark`), existing `appCodeMirrorTheme` from `web/src/lib/codemirrorTheme.ts`.

---

## Issue 1: Default to Assets for New/Empty Projects

**Problem:** After project creation (`Projects.tsx:223`) and project bootstrap (`ProjectsHome.tsx:101`), the app always navigates to `/app/elt/:projectId`. New projects with zero documents see an empty ELT workbench instead of the Assets upload surface.

**Approach:** Change the hard-coded navigate targets from `/app/elt/` to `/app/assets`. Assets is the correct entry point — it shows the Upload tab by default and has proper empty-state messaging.

### Task 1: Change project creation redirect

**Files:**
- Modify: `web/src/pages/Projects.tsx:223`

**Step 1: Change the navigate target**

In `Projects.tsx`, line 223, change:
```typescript
navigate(`/app/elt/${newId}`);
```
to:
```typescript
navigate(`/app/assets`);
```

The project focus is already set via `notifyProjectListChanged(newId)` on line 222, so the Assets page will pick up the correct project from the focus hook.

**Step 2: Verify manually**

Run: `npm run dev` (from `web/`)
1. Create a new project
2. Confirm it navigates to `/app/assets` showing the Upload tab
3. Confirm the project selector rail shows the newly created project as focused

**Step 3: Commit**

```bash
git add web/src/pages/Projects.tsx
git commit -m "fix: redirect new projects to Assets instead of ELT"
```

### Task 2: Change bootstrap redirect

**Files:**
- Modify: `web/src/pages/ProjectsHome.tsx:48,101`
- Possibly modify: `web/src/router.tsx` (if ELT route uses ProjectsHome without explicit props)

**Step 1: Change the default basePath and navigate target**

In `ProjectsHome.tsx`, line 48, change:
```typescript
export default function ProjectsHome({ title = 'ELT', basePath = '/app/elt' }: ProjectsHomeProps) {
```
to:
```typescript
export default function ProjectsHome({ title = 'Assets', basePath = '/app/assets' }: ProjectsHomeProps) {
```

Line 101 appends a project ID to basePath. The Assets route uses the project focus hook (no ID in path). Change line 101 from:
```typescript
navigate(`${basePath}/${targetProject.project_id}`, { replace: true });
```
to:
```typescript
navigate(basePath, { replace: true });
```

The project focus is already written on line 100 (`writeFocusedProjectId`).

**Step 2: Check for callers that pass custom basePath**

Search for `<ProjectsHome` or imports of `ProjectsHome`. If the `/app/elt` route in `router.tsx` renders `<ProjectsHome />` without props, it will now redirect to Assets. That route should pass explicit props: `<ProjectsHome title="ELT" basePath="/app/elt" />`.

**Step 3: Verify manually**

1. Clear localStorage, navigate to `/app/elt` — should still work if it passes its own basePath
2. Navigate to `/app/assets` directly — should bootstrap correctly
3. First-time user (no projects) — should auto-create project and land on Assets

**Step 4: Commit**

```bash
git add web/src/pages/ProjectsHome.tsx web/src/router.tsx
git commit -m "fix: default bootstrap redirect to Assets instead of ELT"
```

---

## Issue 2: Code File Preview via CodePreview

**Problem:** Code files (.py, .ts, .js, .go, .rs, .html, .css, .yaml, etc.) and plain text files (.txt, .csv) fall through all type checks in `PreviewTabPanel` and show a useless "Open file" link. The app already has CodeMirror 6 installed with language packs and a custom theme.

**Approach:** Add a `CodePreview` component (read-only CodeMirror) and an `isTextBasedDocument()` helper. Insert it into the existing PreviewTabPanel detection chain **after** all existing renderers (PDF, Image, JSON tree, Markdown, DOCX, PPTX, XLSX) but **before** the fallback. Existing renderers are untouched — CodePreview only catches formats that currently have no preview.

### Task 3: Add code/text detection helpers in projectDetailHelpers

**Files:**
- Modify: `web/src/lib/projectDetailHelpers.ts`

**Scope: additive only.** Do not remove or modify any existing sets (`TEXT_SOURCE_TYPES`, `TEXT_EXTENSIONS`), helpers (`isTextDocument`, `isJsonDocument`, `isMarkdownDocument`), or `PreviewKind` variants. All existing renderers stay as-is.

**Step 1: Add CODE_PREVIEW sets after the existing TEXT_EXTENSIONS set (after line 74)**

These cover formats that currently fall through to the "Open file" fallback and should instead render in CodePreview:

```typescript
/** Formats for CodePreview — only those NOT already handled by other renderers. */
const CODE_PREVIEW_SOURCE_TYPES = new Set([
  // Code
  'py', 'python', 'js', 'javascript', 'jsx', 'ts', 'typescript', 'tsx',
  'go', 'rs', 'rust', 'cs', 'csharp', 'java',
  'css', 'vue', 'svelte',
  // Data formats not already covered by isJsonDocument/isTextDocument
  'yaml', 'yml', 'toml',
]);

const CODE_PREVIEW_EXTENSIONS = new Set([
  // Code — with language packs
  'py', 'js', 'jsx', 'ts', 'tsx', 'go', 'rs', 'css', 'vue', 'svelte',
  // Code — no language pack (still gets line numbers + monospace)
  'java', 'cs', 'c', 'cpp', 'h', 'hpp', 'rb', 'php', 'sh', 'bash', 'zsh',
  'sql', 'r', 'swift', 'kt', 'scala', 'lua', 'pl', 'ex', 'exs', 'zig',
  // Data
  'yaml', 'yml', 'toml', 'ini', 'env', 'conf', 'cfg',
  // Plain text not in TEXT_EXTENSIONS that should still preview
  'log', 'tsv',
]);
```

**Step 2: Add `isCodePreviewDocument()` helper (after `isXlsxDocument`, line 278)**

```typescript
export function isCodePreviewDocument(doc: ProjectDocumentRow): boolean {
  const sourceType = doc.source_type.toLowerCase();
  if (CODE_PREVIEW_SOURCE_TYPES.has(sourceType)) return true;
  return CODE_PREVIEW_EXTENSIONS.has(getSourceLocatorExtension(doc));
}
```

**Step 3: Add `getCodeFileExtension()` helper**

```typescript
/** Returns the dot-prefixed extension for CodeMirror language lookup, e.g. '.py' */
export function getCodeFileExtension(doc: ProjectDocumentRow): string {
  const locatorExt = getSourceLocatorExtension(doc);
  if (locatorExt) return `.${locatorExt}`;
  const titleExt = getDocumentTitleExtension(doc);
  if (titleExt) return `.${titleExt}`;
  const sourceType = doc.source_type.toLowerCase();
  const typeToExt: Record<string, string> = {
    python: '.py', javascript: '.js', typescript: '.ts',
    rust: '.rs', csharp: '.cs', golang: '.go',
  };
  return typeToExt[sourceType] ?? `.${sourceType}`;
}
```

**Step 4: Add `'code'` to PreviewKind (additive, not replacing)**

Change line 10:
```typescript
export type PreviewKind = 'none' | 'pdf' | 'image' | 'text' | 'json' | 'markdown' | 'docx' | 'xlsx' | 'pptx' | 'file';
```
to:
```typescript
export type PreviewKind = 'none' | 'pdf' | 'image' | 'text' | 'json' | 'markdown' | 'code' | 'docx' | 'xlsx' | 'pptx' | 'file';
```

**Step 5: Commit**

```bash
git add web/src/lib/projectDetailHelpers.ts
git commit -m "feat: add isCodePreviewDocument detection and 'code' PreviewKind"
```

### Task 4: Create read-only CodePreview component

**Files:**
- Create: `web/src/components/documents/CodePreview.tsx`

Reuses the `getLanguageExtension()` pattern from `CodeEditorSurface.tsx:22-37` and `appCodeMirrorTheme` from `codemirrorTheme.ts`. Strictly read-only — no editing, no cursor, no onChange.

**Step 1: Write the component**

```tsx
/**
 * Read-only CodeMirror 6 viewer for all text-based file preview.
 * Applies syntax highlighting when a language pack matches the extension.
 * Files without a language pack still get line numbers and monospace.
 */
import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, type Extension } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { python } from '@codemirror/lang-python';
import { rust } from '@codemirror/lang-rust';
import { go } from '@codemirror/lang-go';
import { yaml } from '@codemirror/lang-yaml';
import { json } from '@codemirror/lang-json';
import { appCodeMirrorTheme } from '@/lib/codemirrorTheme';

function getLanguageExtension(ext: string): Extension | null {
  switch (ext) {
    case '.js': return javascript();
    case '.jsx': return javascript({ jsx: true });
    case '.ts': return javascript({ typescript: true });
    case '.tsx': return javascript({ jsx: true, typescript: true });
    case '.html': case '.htm': case '.vue': case '.svelte': return html();
    case '.css': return css();
    case '.py': return python();
    case '.rs': return rust();
    case '.go': return go();
    case '.yaml': case '.yml': return yaml();
    case '.json': return json();
    default: return null;
  }
}

type CodePreviewProps = {
  content: string;
  extension: string;
};

export function CodePreview({ content, extension }: CodePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    viewRef.current?.destroy();

    const extensions: Extension[] = [
      basicSetup,
      appCodeMirrorTheme,
      EditorView.editable.of(false),
      EditorState.readOnly.of(true),
      EditorView.lineWrapping,
    ];

    const lang = getLanguageExtension(extension);
    if (lang) extensions.push(lang);

    const state = EditorState.create({ doc: content, extensions });
    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [content, extension]);

  return <div ref={containerRef} className="h-full w-full overflow-auto" />;
}
```

**Step 2: Commit**

```bash
git add web/src/components/documents/CodePreview.tsx
git commit -m "feat: add read-only CodePreview component for all text-based previews"
```

### Task 5: Wire CodePreview into PreviewTabPanel (additive only)

**Files:**
- Modify: `web/src/components/documents/PreviewTabPanel.tsx`

All existing renderers (PDF, Image, JSON tree, Markdown, Text `<pre>`, DOCX, PPTX, XLSX) stay untouched. CodePreview is inserted as a new check **after all existing checks** but **before the fallback**.

**Step 1: Add imports**

Add `isCodePreviewDocument` and `getCodeFileExtension` to the existing import from `projectDetailHelpers`:
```typescript
  isCodePreviewDocument,
  getCodeFileExtension,
```

Add component import:
```typescript
import { CodePreview } from '@/components/documents/CodePreview';
```

**Step 2: Add code detection in the loadPreview effect**

After the `isPptxDocument` block (line 168) and before the final fallback (line 171), add:

```typescript
      if (isCodePreviewDocument(doc)) {
        try {
          const response = await fetch(signedUrl);
          const text = await response.text();
          if (cancelled) return;
          const truncated = text.length > 200_000
            ? `${text.slice(0, 200_000)}\n\n// [Preview truncated]`
            : text;
          setPreviewKind('code');
          setPreviewText(truncated.length > 0 ? truncated : '// [Empty file]');
          setPreviewUrl(signedUrl);
          setPreviewLoading(false);
          return;
        } catch {
          if (cancelled) return;
          setPreviewKind('file');
          setPreviewUrl(signedUrl);
          setPreviewLoading(false);
          return;
        }
      }
```

**Step 3: Add code render block**

After the `previewKind === 'pptx'` render block (after line 377) and before the final fallback `if (previewUrl)` block (line 379), add:

```typescript
  if (previewKind === 'code' && previewText) {
    return renderStandardContentPreview(
      <CodePreview
        content={previewText}
        extension={getCodeFileExtension(doc)}
      />,
      { downloadUrl: showHeaderDownload ? previewUrl : null, contentClassName: 'overflow-hidden' },
    );
  }
```

**Step 4: Verify manually**

1. Upload `.py` → syntax-highlighted Python (was "Open file")
2. Upload `.ts` → syntax-highlighted TypeScript (was "Open file")
3. Upload `.go` → syntax-highlighted Go (was "Open file")
4. Upload `.yaml` → syntax-highlighted YAML (was "Open file")
5. Upload `.sh` → monospace with line numbers (was "Open file")
6. Upload `.java` → monospace with line numbers (was "Open file")
7. **Existing renderers unchanged:**
   - `.md` → rendered markdown (ReactMarkdown)
   - `.json` → JSON tree view
   - `.txt` → plain text `<pre>`
   - PDF, Image, DOCX, PPTX → their existing viewers

**Step 5: Commit**

```bash
git add web/src/components/documents/PreviewTabPanel.tsx
git commit -m "feat: wire CodePreview for code/data files that had no preview"
```

---

## Verification

1. **New project flow:** Create new project → lands on `/app/assets` with Upload tab visible
2. **Empty project redirect:** Navigate to `/app/elt` with no focused project → bootstraps and lands on Assets
3. **ELT still works:** Navigate to `/app/elt/:projectId` directly → still renders ELT workbench
4. **Code preview — Python:** Upload `.py` → syntax-highlighted (was "Open file")
5. **Code preview — TypeScript:** Upload `.ts` → syntax-highlighted (was "Open file")
6. **Code preview — Go:** Upload `.go` → syntax-highlighted (was "Open file")
7. **Code preview — no lang pack:** Upload `.java` or `.sh` → monospace + line numbers (was "Open file")
8. **Existing renderers untouched:**
   - `.md` → rendered markdown (ReactMarkdown)
   - `.json` → JSON tree view
   - `.txt` → plain text `<pre>`
   - PDF, Image, DOCX, PPTX → their existing viewers
9. **Binary fallback:** Upload `.xyz` → "Open file" download link

## Files Modified

| File | Change |
|------|--------|
| `web/src/pages/Projects.tsx` | Redirect to `/app/assets` after project creation |
| `web/src/pages/ProjectsHome.tsx` | Default basePath to `/app/assets`, drop projectId from URL |
| `web/src/router.tsx` | Add explicit props to ELT route's ProjectsHome usage |
| `web/src/lib/projectDetailHelpers.ts` | Add `CODE_PREVIEW_*` sets, `isCodePreviewDocument()`, `getCodeFileExtension()`, add `'code'` to PreviewKind |
| `web/src/components/documents/CodePreview.tsx` | New: read-only CodeMirror viewer |
| `web/src/components/documents/PreviewTabPanel.tsx` | Add CodePreview after existing renderers, before fallback |