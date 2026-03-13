# OnlyOffice XLSX & PPTX Edit Support — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the Preview tab's Edit/Preview toggle from DOCX-only to also support XLSX and PPTX, using the existing `OnlyOfficeEditorPanel` which is already format-agnostic. Also update the standalone DocsEditor page to list all editable formats, not just DOCX.

**Architecture:** Add XLSX constants and an `isXlsxDocument()` helper alongside the existing `isDocxDocument`/`isPptxDocument` pattern. Add a unifying `isOnlyOfficeEditable()` helper. Add `'xlsx'` to the `PreviewKind` union. In `PreviewTabPanel`, add an XLSX detection branch, rename DOCX-specific state to be generic, extract the Edit/Preview toggle button as a shared helper, and wire it into the XLSX and PPTX render branches. Update `DocsEditor` to use `isOnlyOfficeEditable` instead of `isDocxDocument`.

**Tech Stack:** React, TypeScript, existing `OnlyOfficeEditorPanel` component, existing `projectDetailHelpers` detection pattern.

---

### Task 1: Add `isXlsxDocument`, `isOnlyOfficeEditable` helpers and `'xlsx'` PreviewKind

**Files:**
- Modify: `web/src/lib/projectDetailHelpers.ts`

**Step 1: Add XLSX constants**

After `PPTX_EXTENSIONS` (line 63), before `TEXT_EXTENSIONS` (line 64), add:

```typescript
const XLSX_SOURCE_TYPES = new Set(['xlsx']);
const XLSX_EXTENSIONS = new Set(['xlsx']);
```

**Step 2: Add `'xlsx'` to `PreviewKind`**

Change line 13 from:
```typescript
export type PreviewKind = 'none' | 'pdf' | 'image' | 'text' | 'markdown' | 'docx' | 'pptx' | 'file';
```
to:
```typescript
export type PreviewKind = 'none' | 'pdf' | 'image' | 'text' | 'markdown' | 'docx' | 'xlsx' | 'pptx' | 'file';
```

**Step 3: Add `isXlsxDocument` and `isOnlyOfficeEditable` functions**

After `isPptxDocument` (ends line 254), add:

```typescript
export function isXlsxDocument(doc: ProjectDocumentRow): boolean {
  const sourceType = doc.source_type.toLowerCase();
  if (XLSX_SOURCE_TYPES.has(sourceType)) return true;
  return XLSX_EXTENSIONS.has(getSourceLocatorExtension(doc));
}

export function isOnlyOfficeEditable(doc: ProjectDocumentRow): boolean {
  return isDocxDocument(doc) || isXlsxDocument(doc) || isPptxDocument(doc);
}
```

**Step 4: Commit**

```bash
git add web/src/lib/projectDetailHelpers.ts
git commit -m "feat: add isXlsxDocument, isOnlyOfficeEditable helpers and xlsx PreviewKind"
```

---

### Task 2: Route XLSX files to their own preview branch in PreviewTabPanel

**Files:**
- Modify: `web/src/components/documents/PreviewTabPanel.tsx`

**Step 1: Add `isXlsxDocument` to the import**

Update the import block (lines 12-25) — add `isXlsxDocument` after `isTextDocument`:

```typescript
import {
  dedupeLocators,
  getDocumentFormat,
  isDocxDocument,
  isImageDocument,
  isMarkdownDocument,
  isPdfDocument,
  isPptxDocument,
  isTextDocument,
  isXlsxDocument,
  type PreviewKind,
  type ProjectDocumentRow,
  resolveSignedUrlForLocators,
  toDoclingJsonLocator,
} from '@/lib/projectDetailHelpers';
```

**Step 2: Add XLSX detection in the `loadPreview` effect**

Insert after the `isTextDocument` block (line 121, the closing `}` of the text try/catch) and before `isDocxDocument` (line 122):

```typescript
      if (isXlsxDocument(doc)) {
        setPreviewKind('xlsx');
        setPreviewUrl(signedUrl);
        setPreviewLoading(false);
        return;
      }
```

Detection order becomes: pdf → image → text → **xlsx** → docx → pptx → fallback.

**Step 3: Commit**

```bash
git add web/src/components/documents/PreviewTabPanel.tsx
git commit -m "feat: route xlsx files to dedicated preview kind in PreviewTabPanel"
```

---

### Task 3: Generalize the Edit/Preview toggle for DOCX, XLSX, and PPTX

**Files:**
- Modify: `web/src/components/documents/PreviewTabPanel.tsx`

Current state — the code has:
- `docxEditMode` state (line 37)
- `docxPreviewRevision` state (line 38)
- Edit toggle only in the `previewKind === 'docx'` branch (lines 369-403)
- PPTX branch has no edit toggle at all (lines 405-415)

**Step 1: Rename state variables (find-and-replace)**

```
docxEditMode     → editMode          (lines 37, 373, 382, 387, 399)
setDocxEditMode  → setEditMode       (lines 37, 375)
docxPreviewRevision    → previewRevision    (lines 38, 391)
setDocxPreviewRevision → setPreviewRevision (lines 38, 376)
```

Lines 37-38 become:
```typescript
  const [editMode, setEditMode] = useState(false);
  const [previewRevision, setPreviewRevision] = useState(0);
```

**Step 2: Reset edit mode when doc changes**

Add `setEditMode(false);` in two places in the `loadPreview` function:

1. In the early-return block when `!doc` — after line 51 (`setPdfPreviewMode('file');`):
```typescript
        setPdfPreviewMode('file');
        setEditMode(false);
        return;
```

2. In the main path — after line 60 (`setPdfPreviewMode('file');`):
```typescript
      setPdfPreviewMode('file');
      setEditMode(false);
```

**Step 3: Extract the edit toggle button as a shared helper**

Add after `renderStandardContentPreview` (line 281), before `if (!doc)` (line 283):

```typescript
  const renderEditToggle = () => (
    <button
      type="button"
      aria-pressed={editMode}
      onClick={() => {
        setEditMode((prev) => {
          if (prev) setPreviewRevision((r) => r + 1);
          return !prev;
        });
      }}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {editMode ? <><IconEye size={14} /> Preview</> : <><IconEdit size={14} /> Edit</>}
    </button>
  );
```

**Step 4: Replace the DOCX branch (lines 369-403)**

Remove the inline `docxToggleAction` variable. Replace the entire block with:

```typescript
  if (previewKind === 'docx' && previewUrl) {
    return renderPreviewWithUnifiedHeader(
      editMode ? (
        <OnlyOfficeEditorPanel key={doc.source_uid} doc={doc} />
      ) : (
        <DocxPreview
          key={`${doc.source_uid}:${previewUrl}:${previewRevision}`}
          title={doc.doc_title}
          url={previewUrl}
          hideToolbar
        />
      ),
      {
        downloadUrl: previewUrl,
        useScrollArea: editMode ? false : undefined,
        headerActions: renderEditToggle(),
      },
    );
  }
```

**Step 5: Add the XLSX branch (insert before the DOCX branch)**

```typescript
  if (previewKind === 'xlsx' && previewUrl) {
    return renderPreviewWithUnifiedHeader(
      editMode ? (
        <OnlyOfficeEditorPanel key={doc.source_uid} doc={doc} />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
          Click Edit to open in spreadsheet editor.
        </div>
      ),
      {
        downloadUrl: previewUrl,
        useScrollArea: editMode ? false : undefined,
        headerActions: renderEditToggle(),
      },
    );
  }
```

**Step 6: Replace the PPTX branch (lines 405-415)**

Replace the existing PPTX block (which has no edit toggle) with:

```typescript
  if (previewKind === 'pptx' && previewUrl) {
    return renderPreviewWithUnifiedHeader(
      editMode ? (
        <OnlyOfficeEditorPanel key={doc.source_uid} doc={doc} />
      ) : (
        <PptxPreview
          key={`${doc.source_uid}:${previewUrl}:${previewRevision}`}
          title={doc.doc_title}
          url={previewUrl}
          hideHeaderMeta
        />
      ),
      {
        downloadUrl: previewUrl,
        useScrollArea: editMode ? false : undefined,
        headerActions: renderEditToggle(),
      },
    );
  }
```

**Step 7: Commit**

```bash
git add web/src/components/documents/PreviewTabPanel.tsx
git commit -m "feat: extend OnlyOffice edit toggle to xlsx and pptx formats"
```

---

### Task 4: Expand DocsEditor page filter to all editable formats

**Files:**
- Modify: `web/src/pages/DocsEditor.tsx`

**Step 1: Update import (lines 8-12)**

Change:
```typescript
import {
  type ProjectDocumentRow,
  isDocxDocument,
  formatBytes,
} from '@/lib/projectDetailHelpers';
```
to:
```typescript
import {
  type ProjectDocumentRow,
  isOnlyOfficeEditable,
  formatBytes,
} from '@/lib/projectDetailHelpers';
```

**Step 2: Update filter and rename variable (lines 24, 33-38)**

Change comment on line 24:
```typescript
  // Fetch editable documents for the active project
```

Change line 33 and rename `docxOnly` → `editable` on lines 34, 37, 38:
```typescript
      const editable = all.filter(isOnlyOfficeEditable);
      setDocs(editable);
      setSelectedSourceUid((prev) => {
        if (prev && editable.some((d) => d.source_uid === prev)) return prev;
        return editable[0]?.source_uid ?? null;
      });
```

**Step 3: Update empty-state message (line 93)**

Change:
```typescript
              No DOCX files in this project.
```
to:
```typescript
              No editable files in this project.
```

**Step 4: Commit**

```bash
git add web/src/pages/DocsEditor.tsx
git commit -m "feat: expand DocsEditor page to show all OnlyOffice-editable formats"
```

---

### Verification

1. **TypeScript:** Run `npx tsc --noEmit` from `web/` — zero errors.
2. **Dev server:** Run `npm run dev` — no console errors on startup.
3. **DOCX edit:** In ELT workbench, select a DOCX → click Edit → OnlyOffice word editor loads → click Preview → DocxPreview renders.
4. **XLSX edit:** Upload an XLSX → select it → preview shows "Click Edit to open in spreadsheet editor" → click Edit → OnlyOffice spreadsheet editor loads.
5. **PPTX edit:** Select a PPTX → PptxPreview renders → click Edit → OnlyOffice presentation editor loads → click Preview → PptxPreview renders again.
6. **DocsEditor page:** Navigate to `/app/docs` → sidebar shows DOCX, XLSX, and PPTX files (not just DOCX).
7. **Doc switching:** While in edit mode, select a different file → edit mode resets to preview.