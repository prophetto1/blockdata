# BlockData — Page Screenshots & Descriptions

> Captured 2026-02-22. For designer review: each page is described with its purpose, current layout, and components.

---

## MARKETING PAGES (Public)

### 01 — Landing Page (`/`)
**File:** `01-landing-page.png`

Full-width dark-themed landing page. Top nav bar with "BlockData" logo, links (How it works, Use cases, Integrations), dark/light toggle, Log in, and green "Get Started" CTA.

**Sections (top to bottom):**
1. **Hero** — Large heading ("Your documents. Structured knowledge. Zero drift."), subtext, two CTAs ("Get started", "How it works"), and a JSON code preview block showing an export sample.
2. **Schema-driven** — "Your schema is the engine." Three cards: Analyze (metadata), Revise (content transform), Both (combined). Each card has an icon, badge (Analyze/Revise/Both), description, and sample field tags.
3. **Workflow** — "Four steps. One repeatable process." Four numbered cards (Upload, Define schema, Process, Review & confirm) with icons and descriptions. "Deep dive into the pipeline" link.
4. **Use Cases** — "Built for scale." Three use-case cards with brief descriptions. "View all use cases" button.
5. **Capabilities** — "Everything you need to work with documents." Six feature cards in a 3x2 grid (Multi-format ingestion, Schema-driven processing, Block-level parallelism, Real-time working surface, Deterministic identity, Human-in-the-loop review). "See integrations" link.
6. **CTA Footer** — "Extract metadata. Revise content." with green "Get started" button.
7. **Footer** — BlockData branding, "Document Intelligence Platform" tagline, nav links.

---

### 02 — How It Works (`/how-it-works`)
**File:** `02-how-it-works.png`

**Sections:**
1. **Hero** — "Every block. Same instructions. Zero drift." with explanatory subtext.
2. **Pipeline** — "Six stages. Full lifecycle." Six numbered cards: Upload, Decompose, Define schema, Process, Review, Export. "Start building" CTA.
3. **Grid Demo** — "The grid is the product." Mockup of a data grid showing blocks (#42-45) with columns: #, TYPE, CONTENT (SOURCE), FUNCTION, AUTHORITY, STATUS. Status badges: CONFIRMED, STAGED, PENDING.
4. **Block-level vs Document-level** — Side-by-side comparison with checklist items (200-page document, Traceability, Parallelism, Human review, Scale). Schema flexibility section with three code samples (Metadata, Revision, Combined).
5. **CTA** — "Ready to build?" with Get started / View use cases buttons.

---

### 03 — Use Cases (`/use-cases`)
**File:** `03-use-cases.png`

**Sections:**
1. **Hero** — 'Beyond "chat with PDF"' heading.
2. **Three detailed use cases:** Each has a badge (Metadata Enrichment / Combined Track / Content Revision), scenario description, BlockData approach, example schema fields, output description, and downstream uses.
   - Long Document Review
   - Corpus Structuring
   - Batch Content Transformation
3. **More use cases** — Four smaller cards: Contract review, Research corpus annotation, Survey response coding, Policy translation workflows.
4. **CTA** — "Try it on a real document."

---

### 04 — Integrations (`/integrations`)
**File:** `04-integrations.png`

**Sections:**
1. **Hero** — "Integrations start with a stable export contract."
2. **Flow diagram** — "Documents in. Structured data out." Shows Sources (Documents: PDF/DOCX/MD, Data & Media: XLSX/PPTX/CSV/Images, Cloud Storage: S3/GDrive/SharePoint) flowing through BlockData to Destinations (File Exports: JSONL/CSV/Parquet, Databases & Graphs: Neo4j/PostgreSQL/Snowflake, Vector & Automation: Pinecone/Weaviate/Webhooks). Flow arrows: Upload > Parse > Sync > Export > Push > Index.
3. **Export Contract** — Description of immutable vs user-defined sections with JSON code sample.
4. **Formats** — "JSONL is canonical." Three format cards (JSONL/Canonical, CSV/Derived, Parquet/Derived) with "Best for" and "Details".
5. **Pipelines** — "Export the right file." Five cards: Fine-tuning datasets, Evaluation benchmarks, Analytical datasets, Vector stores, Document reconstruction.
6. **Push integrations** — "The platform calls you." Three cards: Neo4j, Webhooks, Object storage.
7. **Downstream** — "What teams build." Four cards: RAG with structured retrieval, Compliance and audit, Cross-schema joins, Batch transformation.
8. **CTA** — "Build a dataset you can trust."

---

## AUTH PAGES (Public)

### 05 — Login (`/login`)
**File:** `05-login.png`

Centered form on dark background. Public nav bar at top. "Welcome back" heading, subtext "Enter your credentials to access your workspace." Email field, Password field with show/hide toggle. "Sign in" button. "Don't have an account? Start building" link. Footer at bottom.

### 06 — Register (`/register`)
**File:** `06-register.png`

Same layout as login. "Create your account" heading, subtext "Start building structure from your unstructured data." Fields: Full Name, Email, Password (with toggle), Confirm Password (with toggle). "Create account" button. "Already have an account? Sign in" link.

---

## APP PAGES (Protected / Authenticated)

All app pages share a common shell:
- **Left sidebar (LeftRail):** Collapsible. Project selector dropdown at top, then nav items: Parse, Extract, Transform, Database, Schema. Bottom section: Layout, Search (Ctrl+K), Show Assistant. User avatar/email with Settings and Sign out.
- **Top command bar:** Three-column headers: Documents, Configuration, Preview — each collapsible.

---

### 07 — Project Detail / Parse (`/app/projects/:id`)
**File:** `07-project-detail.png` (sidebar collapsed)
**File:** `08-project-detail-sidebar-expanded.png` (sidebar expanded)

Three-column layout:
1. **Documents column (left):** Uppy upload dropzone (drag & drop with My Device / Google Drive tabs, file type filter). Below: document list with checkbox, filename, size, format badge (PDF/MD), status indicator (green dot = Uploaded, red dot = Failed with retry button), delete button. Pagination at bottom.
2. **Configuration column (center):** Basic/Advanced tabs. Basic shows parsing "Tiers" selector (Fast, Cost Effective, Agentic, Agentic Plus) with description and credit cost. Save config and Run parse buttons.
3. **Preview column (right):** Document preview renderer showing the parsed PDF. Page navigation (< 3/3 >) and zoom controls (- 100% +). Renders the actual PDF content.

---

### 09 — Transform Page (`/app/transform/:id`)
**File:** `09-transform-page.png`

Same three-column layout as Parse. Configuration column is empty/collapsed. Preview shows the document PDF. The Preview dropdown button offers: Preview, Metadata, Blocks, Grid, Outputs.

---

### 09b — Transform: Metadata View
**File:** `09b-transform-preview-dropdown.png`

Preview switched to "Metadata" mode. Shows the PDF with a block overlay on the right side listing each block with its type, index, page, and a content preview. Toggles for "Show overlay" and "Show results" at top. Each block is color-coded by type (heading = yellow border, paragraph = blue border, list_item = orange border).

---

### 10 — Schema Layout Page (`/app/schemas/layout`)
**File:** `10-schema-layout.png`

Three-column layout with a different document set (37 dummy PDFs). Documents column shows a simpler file list without Uppy uploader. Configuration shows Basic/Advanced with Tiers selector. Preview shows "Dummy PDF file" with Preview/Metadata/Blocks tab switcher.

---

### 11 — Extract: Advanced Config (`/app/extract/:id`)
**File:** `11-extract-advanced-config.png`

Extract page with the Advanced configuration tab active. Shows:
- **Model Settings:** Parse Model dropdown (Claude 4.5 Haiku), Extract Model dropdown (GPT 4.1)
- **Extraction Settings:** System prompt text input, Page Range input, Context window size input
- **Extensions:** Toggle switches for Use Reasoning, Cite Sources (on), Confidence Score (on)
- **Other:** Chunk Mode radio buttons (Page / Section), High resolution mode toggle, Invalidate Cache toggle

---

### 12 — Extract: Basic Config
**File:** `12-extract-basic-config.png`

Extract page with Basic config tab. Shows:
- **Mode** selector: Fast, Balanced, Multimodal, Premium (selected). Shows "60 credits" cost.
- **Extraction Target** radio buttons: Document (selected, "Extract from the entire document at once"), Page ("Extract from each page separately"), Table Row ("Extract from each row of a table structure").
- Run extract button (play icon).

---

### 13 — Extract: Schema Tab
**File:** `13-extract-schema-tab.png`

Extract page with Schema tab active. Shows:
- Table/Code mode toggle buttons (grid icon / code icon)
- Expand and Reset buttons
- Empty state: "Create Schema" heading with description. Two buttons: "Auto-Generate" (ghost) and "Create Manually" (filled).

---

### 14 — Schemas Page (`/app/schemas`)
**File:** `14-schemas-page.png`

Standalone schema workspace. Full-width main area (no three-column split). Same schema builder as the Extract schema tab: table/code toggle, expand/reset buttons, empty "Create Schema" state with Auto-Generate and Create Manually buttons. "Standalone schema workspace" label in top-right.

---

### 15 — Settings (`/app/settings`)
**File:** `15-settings.png`

**Top:** Night mode toggle (on), "Superuser Controls" link (top-right).

**Left panel:** Provider list with icons and descriptions:
- Anthropic (Claude models) — selected
- OpenAI (GPT & reasoning models)
- Google AI (Gemini models)
- Custom / Self-hosted (OpenAI-compatible endpoint)

**Right panel (for selected provider):**
- **API Key** section with masked input, show/hide toggle, Test button.
- **Model Defaults** section: Model dropdown (Claude Sonnet 4.5 — balanced), Temperature slider (0 to 1.0, set to 0.3), Max tokens per block number input (4096).

---

### 16 — Superuser Settings (`/app/settings/superuser`)
**File:** `16-superuser-settings.png`

Admin panel. Left sidebar shows category tabs with toggle switches:
- Models (3 policies)
- Worker (14 policies)
- Upload (6 policies)
- Audit History (4 entries)

Main area shows policy cards for the Models category:
- `models.platform_default_max_tokens` (integer) — value: 2000
- `models.platform_default_model` (string) — value: claude-sonnet-4-5-20250929
- `models.platform_default_temperature` (number) — value: 0.3

Each card has: policy key, description, type badge, value input, "Reason (optional)" text field, last updated timestamp, Save button.

---

### 17 — Transform: Blocks View
**File:** `17-transform-blocks-view.png`

Preview area switched to "Blocks" mode. Shows a vertical list of all parsed blocks. Each block card shows:
- Type and index label (e.g., "heading | #0", "paragraph | #1", "list_item | #5")
- Block content text (truncated for long content)
- Color-coded left border by block type (yellow = heading, blue = paragraph, orange = list_item)

71 blocks total displayed in a scrollable list.

---

### 18 — Transform: Grid View (ag-Grid)
**File:** `18-transform-grid-view.png`

Preview area switched to "Grid" mode. Shows:
- **Grid toolbar:** Compact/Comfortable toggle, S/M/L size toggle, Sans/Serif/Mono font toggle, Align dropdown, Columns dropdown, Grid Config button.
- **Grid header:** "Run citations" button.
- **ag-Grid table** with columns: ID, Pages, Type (sortable + filterable), Block (content), Locator (JSON pointer), Parser Type. Each row is a block. Type column has colored badges (HEADING, PARAGRAPH, LIST_ITEM).
- **Pagination:** Blocks/page selector (50), page 1/2 with Previous/Next.

---

## SUMMARY

**Total unique screenshots: 18 files**

| # | File | Page | Route |
|---|------|------|-------|
| 01 | `01-landing-page.png` | Landing | `/` |
| 02 | `02-how-it-works.png` | How It Works | `/how-it-works` |
| 03 | `03-use-cases.png` | Use Cases | `/use-cases` |
| 04 | `04-integrations.png` | Integrations | `/integrations` |
| 05 | `05-login.png` | Login | `/login` |
| 06 | `06-register.png` | Register | `/register` |
| 07 | `07-project-detail.png` | Parse (collapsed sidebar) | `/app/projects/:id` |
| 08 | `08-project-detail-sidebar-expanded.png` | Parse (expanded sidebar) | `/app/projects/:id` |
| 09 | `09-transform-page.png` | Transform (Preview) | `/app/transform/:id` |
| 09b | `09b-transform-preview-dropdown.png` | Transform (Metadata view) | `/app/transform/:id` |
| 10 | `10-schema-layout.png` | Schema Layout | `/app/schemas/layout` |
| 11 | `11-extract-advanced-config.png` | Extract (Advanced) | `/app/extract/:id` |
| 12 | `12-extract-basic-config.png` | Extract (Basic) | `/app/extract/:id` |
| 13 | `13-extract-schema-tab.png` | Extract (Schema) | `/app/extract/:id` |
| 14 | `14-schemas-page.png` | Schemas | `/app/schemas` |
| 15 | `15-settings.png` | Settings | `/app/settings` |
| 16 | `16-superuser-settings.png` | Superuser Settings | `/app/settings/superuser` |
| 17 | `17-transform-blocks-view.png` | Transform (Blocks view) | `/app/transform/:id` |
| 18 | `18-transform-grid-view.png` | Transform (Grid view) | `/app/transform/:id` |
