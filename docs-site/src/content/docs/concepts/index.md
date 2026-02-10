---
title: Core Concepts
description: The platform's entity model — how Projects, Documents, Blocks, Schemas, Runs, Overlays, and Export relate to each other.
sidebar:
  label: Overview
  order: 0
---

BlockData is built around a clear entity hierarchy. Understanding these entities and how they connect is the key to using the platform effectively.

## Entity Hierarchy

```
User
  └── Projects (containers for related documents)
        └── Documents (uploaded source files, parsed into blocks)
              ├── Blocks (atomic semantic units — paragraphs, headings, tables, etc.)
              └── Runs (apply a schema to this document's blocks)
                    └── Overlays (per-block AI output: staged → reviewed → confirmed)

  └── Schemas (global extraction templates, reusable across projects)
```

## Data Flow

The platform pipeline moves left to right:

1. **Upload** — User adds files to a project. Each file gets a deterministic `source_uid`.
2. **Conversion** — The platform parses the file into blocks using the appropriate track (mdast for Markdown, Docling for DOCX/PDF). Each conversion gets a deterministic `conv_uid`.
3. **Schema binding** — User selects a schema and creates a run. This generates one pending overlay per block.
4. **Processing** — The AI worker claims blocks in packs, processes them against the schema, and writes structured output to staging.
5. **Review** — User reviews staged overlays in the block viewer grid, edits if needed, and confirms.
6. **Export** — Confirmed overlays are exported as JSONL with the canonical two-key shape: `immutable` + `user_defined`.

## Key Properties

- **Immutability** — Once a document is parsed into blocks, those blocks never change. All AI output lives in a separate overlay layer.
- **Multi-schema** — The same blocks can have multiple schemas applied via separate runs. Each run produces independent overlays.
- **Deterministic identity** — `source_uid`, `conv_uid`, and `block_uid` are SHA-256 hashes derived from content, making them stable and reproducible.
- **Staging before confirmation** — AI output lands in staging first. Nothing reaches the export boundary without human review and confirmation.

## Next

Read about each entity in detail:

- [Projects](/docs/concepts/projects/) — The top-level container
- [Documents](/docs/concepts/documents/) — Upload and conversion
- [Blocks](/docs/concepts/blocks/) — The atomic unit
- [Schemas](/docs/concepts/schemas/) — Extraction templates
- [Runs](/docs/concepts/runs/) — Applying a schema
- [Overlays](/docs/concepts/overlays/) — AI output and review
- [Export](/docs/concepts/export/) — The canonical output contract
