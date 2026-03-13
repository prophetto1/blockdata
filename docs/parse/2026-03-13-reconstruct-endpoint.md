# Reconstruct Endpoint Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `/reconstruct` endpoint to platform-api that reconstructs HTML and blocks from stored DoclingDocument JSON, replacing the lossy TS-based block extraction and adding native HTML preview.

**Architecture:** Frontend gets a signed download URL for the docling JSON from Supabase storage, POSTs it to platform-api's `/reconstruct` endpoint. Platform-api downloads the JSON, reconstructs via `DoclingDocument.model_validate()`, returns HTML from `export_to_html()` and blocks from `extract_docling_blocks()`. Frontend renders HTML in the preview panel and blocks in the blocks panel.

**Tech Stack:** Python (FastAPI, docling-core, httpx), TypeScript (React, platformApiFetch)

---

### Task 1: Add ReconstructRequest model

**Files:**
- Modify: `services/platform-api/app/domain/conversion/models.py`

**Step 1: Add the model**

```python
class ReconstructRequest(BaseModel):
    docling_json_url: str
```

**Step 2: Commit**

```bash
git add services/platform-api/app/domain/conversion/models.py
git commit -m "feat: add ReconstructRequest model"
```

---

### Task 2: Add reconstruct service function

**Files:**
- Modify: `services/platform-api/app/domain/conversion/service.py`
- Test: `services/platform-api/tests/test_conversion.py`

**Step 1: Write the failing test**

```python
def test_reconstruct_from_dict():
    """reconstruct_from_dict returns html string and blocks list."""
    from app.domain.conversion.service import reconstruct_from_dict

    # Minimal valid DoclingDocument JSON (as produced by export_to_dict)
    doc_dict = {
        "schema_name": "DoclingDocument",
        "version": "1.3.0",
        "name": "test",
        "origin": {"mimetype": "text/plain", "filename": "test.txt"},
        "furniture": {"self_ref": "#/furniture", "children": [], "content_layer": "furniture", "name": "_root_", "label": "unspecified"},
        "body": {
            "self_ref": "#/body",
            "children": [{"$ref": "#/texts/0"}],
            "content_layer": "body",
            "name": "_root_",
            "label": "unspecified",
        },
        "groups": [],
        "texts": [
            {
                "self_ref": "#/texts/0",
                "parent": {"$ref": "#/body"},
                "children": [],
                "content_layer": "body",
                "label": "paragraph",
                "prov": [],
                "orig": "Hello world",
                "text": "Hello world",
            }
        ],
        "pictures": [],
        "tables": [],
        "key_value_items": [],
        "form_items": [],
        "pages": {},
    }

    html, blocks = reconstruct_from_dict(doc_dict)
    assert isinstance(html, str)
    assert "Hello world" in html
    assert len(blocks) >= 1
    assert blocks[0]["block_content"] == "Hello world"
    assert blocks[0]["block_type"] == "paragraph"
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/test_conversion.py::test_reconstruct_from_dict -v`
Expected: FAIL — `reconstruct_from_dict` not defined

**Step 3: Write the implementation**

In `service.py`, add:

```python
def reconstruct_from_dict(doc_dict: dict[str, Any]) -> tuple[str, list[dict[str, Any]]]:
    """Reconstruct HTML and blocks from a DoclingDocument JSON dict."""
    from docling_core.types.doc import DoclingDocument as DoclingDoc

    doc = DoclingDoc.model_validate(doc_dict)
    html = doc.export_to_html()
    blocks = extract_docling_blocks(doc)
    return html, blocks
```

**Step 4: Run test to verify it passes**

Run: `pytest tests/test_conversion.py::test_reconstruct_from_dict -v`
Expected: PASS

**Step 5: Commit**

```bash
git add services/platform-api/app/domain/conversion/service.py services/platform-api/tests/test_conversion.py
git commit -m "feat: add reconstruct_from_dict service function"
```

---

### Task 3: Add /reconstruct route

**Files:**
- Modify: `services/platform-api/app/api/routes/conversion.py`
- Modify: `services/platform-api/app/domain/conversion/models.py` (import)

**Step 1: Add the route**

```python
from app.domain.conversion.models import ConvertRequest, CitationsRequest, ReconstructRequest
from app.domain.conversion.service import convert, reconstruct_from_dict
from app.infra.http_client import upload_bytes, append_token_if_needed, download_bytes

@router.post("/reconstruct")
async def reconstruct_route(
    body: ReconstructRequest,
    auth: AuthPrincipal = Depends(require_auth),
):
    raw = await download_bytes(body.docling_json_url)
    doc_dict = json.loads(raw)
    html, blocks = reconstruct_from_dict(doc_dict)
    return {"html": html, "blocks": blocks}
```

Add `import json` to the top of the file if not present.

**Step 2: Commit**

```bash
git add services/platform-api/app/api/routes/conversion.py
git commit -m "feat: add /reconstruct endpoint"
```

---

### Task 4: Deploy platform-api to Cloud Run

**Step 1: Deploy**

```powershell
.\scripts\deploy-platform-api.ps1 -SecretName conversion-service-key
```

**Step 2: Verify endpoint exists**

```bash
curl -s https://<cloud-run-url>/openapi.json | jq '.paths["/reconstruct"]'
```

**Step 3: Commit** (if deploy script changed)

---

### Task 5: Add frontend handler for reconstruct preview

**Files:**
- Modify: `web/src/pages/ParsePage.tsx`

**Step 1: Add the reconstruct handler**

```typescript
import { platformApiFetch } from '@/lib/platformApi';

// Add new state for HTML preview
const [htmlPreview, setHtmlPreview] = useState<{ title: string; html: string; loading: boolean } | null>(null);

const handleReconstructPreview = async (doc: ProjectDocumentRow) => {
  setHtmlPreview({ title: doc.doc_title, html: '', loading: true });
  setPreview(null);
  setBlocksPreview(null);

  const jsonUrl = await signedUrlForArtifact(doc.source_uid, 'doclingdocument_json');
  if (!jsonUrl) {
    setHtmlPreview({ title: doc.doc_title, html: '<p>No docling JSON available.</p>', loading: false });
    return;
  }

  try {
    const resp = await platformApiFetch('/reconstruct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docling_json_url: jsonUrl }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    setHtmlPreview({ title: `${doc.doc_title} — HTML`, html: data.html, loading: false });
  } catch {
    setHtmlPreview({ title: doc.doc_title, html: '<p>Reconstruction failed.</p>', loading: false });
  }
};

const handleReconstructBlocks = async (doc: ProjectDocumentRow) => {
  setBlocksPreview({ title: doc.doc_title, blocks: [], loading: true });
  setPreview(null);
  setHtmlPreview(null);

  const jsonUrl = await signedUrlForArtifact(doc.source_uid, 'doclingdocument_json');
  if (!jsonUrl) {
    setBlocksPreview({ title: doc.doc_title, blocks: [], loading: false });
    return;
  }

  try {
    const resp = await platformApiFetch('/reconstruct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docling_json_url: jsonUrl }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    // Map reconstruct blocks to BlockRow shape for existing renderer
    const mapped = data.blocks.map((b: any, i: number) => ({
      block_uid: b.pointer,
      block_index: i,
      block_type: b.block_type,
      block_content: b.block_content,
    }));
    setBlocksPreview({ title: `${doc.doc_title} — Reconstructed`, blocks: mapped, loading: false });
  } catch {
    setBlocksPreview({ title: doc.doc_title, blocks: [], loading: false });
  }
};
```

**Step 2: Add HTML preview rendering in the preview panel**

After the `blocksPreview` section, add:

```tsx
{htmlPreview && !htmlPreview.loading && (
  <>
    <div className="flex items-center justify-between border-b border-border px-4 py-2">
      <h3 className="truncate text-sm font-medium text-foreground">{htmlPreview.title}</h3>
      <button type="button" onClick={() => setHtmlPreview(null)}
        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent">
        <IconX size={14} />
      </button>
    </div>
    <ScrollArea className="min-h-0 flex-1" viewportClass="h-full overflow-auto">
      <div className="parse-html-preview px-6 py-4"
        dangerouslySetInnerHTML={{ __html: htmlPreview.html }} />
    </ScrollArea>
  </>
)}
```

**Step 3: Update action menu items**

Replace the existing preview menu items for parsed docs:

```typescript
...(isParsed
  ? [
      ...(['md', 'txt', 'csv', 'html', 'htm', 'rst', 'org', 'tex', 'latex'].includes(getDocumentFormat(doc).toLowerCase())
          ? [{ label: 'Original Preview', onClick: () => void handleOriginalPreview(doc) }]
          : []),
      { label: 'Docling MD Preview', onClick: () => void handlePreview(doc) },
      { label: 'HTML Preview', onClick: () => void handleReconstructPreview(doc) },
      { label: 'Blocks Preview', onClick: () => void handleReconstructBlocks(doc) },
      { label: 'Download MD', onClick: () => void handleDownloadMd(doc) },
      { label: 'Download DoclingJson', onClick: () => void handleDownloadJson(doc) },
    ]
  : []),
```

**Step 4: Update loading state check**

Update the loading indicator to include htmlPreview:

```tsx
{(preview?.loading || blocksPreview?.loading || htmlPreview?.loading) && (
```

**Step 5: Commit**

```bash
git add web/src/pages/ParsePage.tsx
git commit -m "feat: add HTML and reconstructed blocks preview via /reconstruct"
```

---

### Task 6: Verify end-to-end

**Step 1:** Open the Parse page, select a parsed document
**Step 2:** Click action menu → "HTML Preview" — should show docling's native HTML rendering
**Step 3:** Click action menu → "Blocks Preview" — should show blocks from Python-side extraction (with inline groups merged)
**Step 4:** Verify "Docling MD Preview" still works (unchanged path)

---

## Summary

| Component | Change | File |
|-----------|--------|------|
| Model | Add `ReconstructRequest` | `models.py` |
| Service | Add `reconstruct_from_dict()` | `service.py` |
| Route | Add `POST /reconstruct` | `conversion.py` |
| Deploy | Push to Cloud Run | deploy script |
| Frontend | Add HTML + blocks preview handlers | `ParsePage.tsx` |