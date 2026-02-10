---
title: Projects
description: Projects are the top-level container for organizing related documents, runs, and exports.
sidebar:
  order: 1
---

A **project** is the top-level organizational container in BlockData. Every document belongs to exactly one project. Projects scope bulk operations — applying a schema to all documents, running all pending blocks, confirming all staged overlays, and exporting everything as a ZIP.

## What a project contains

| Entity | Relationship |
|--------|-------------|
| Documents | Owned by the project (via `project_id` FK) |
| Runs | Inherited through documents (a run belongs to a document's `conv_uid`) |
| Overlays | Inherited through runs |

Schemas are **not** project-scoped. They are global to the user and can be applied across any project.

## Project-level actions

From the Project Detail page (`/app/projects/:projectId`):

- **Apply Schema to All** — Creates runs for every ingested document in the project that doesn't already have a run for the selected schema.
- **Run All Pending** — Dispatches all pending blocks across all runs (for the selected schema) to the AI worker.
- **Confirm All** — Bulk-confirms all staged (`ai_complete`) overlays for the selected schema.
- **Export All (ZIP)** — Exports the latest run per document as JSONL files bundled in a ZIP archive.

All bulk actions are scoped to a **selected schema** — you choose a schema from the selector before these buttons become active.

## Data model

| Field | Type | Description |
|-------|------|-------------|
| `project_id` | UUID | Primary key |
| `owner_id` | UUID | FK to `auth.users` |
| `project_name` | text | User-provided name |
| `description` | text | Optional description |
| `created_at` | timestamptz | Creation timestamp |
| `updated_at` | timestamptz | Auto-updated via trigger |

## Navigation

Projects are the entry point after login. The app's sidebar has four top-level items:

- **Projects** (`/app`) — Project list, the default dashboard
- **Schemas** (`/app/schemas`) — Global schema library
- **Integrations** (`/app/integrations`) — Future integration surfaces
- **Settings** (`/app/settings`) — API keys and model defaults
