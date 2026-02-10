---
title: Architecture
description: Under-the-hood design — Edge Functions, parsing tracks, the worker protocol, the data model, and the staging layer.
sidebar:
  label: Overview
  order: 0
---

BlockData runs on Supabase (Postgres + Edge Functions + Auth + Realtime + Storage) with a Cloud Run conversion service for non-Markdown documents.

## System components

| Component | Technology | Role |
|-----------|-----------|------|
| **Database** | Supabase Postgres | Tables, RLS, RPCs, Realtime |
| **Edge Functions** | Deno (Supabase) | `ingest`, `conversion-complete`, `worker`, `runs`, `schemas`, `export-jsonl`, `test-api-key` |
| **Conversion service** | Cloud Run (Docker) | Docling — converts DOCX/PDF to markdown + DoclingDocument JSON |
| **Storage** | Supabase Storage | Uploaded files and conversion artifacts |
| **Frontend** | React + Mantine + AG Grid | SPA at blockdata.run |
| **Auth** | Supabase Auth | Email/password, RLS-enforced row ownership |
| **Realtime** | Supabase Realtime | Live overlay updates in the block viewer grid |

## Edge Function inventory

| Function | Trigger | Purpose |
|----------|---------|---------|
| `ingest` | POST (file upload) | Accept file, compute source_uid, store, create document row |
| `conversion-complete` | Webhook (from Cloud Run) | Extract blocks from parsed representation |
| `worker` | POST (dispatch) | Claim block packs, call AI model, write staging overlays |
| `runs` | POST | Create run + pending overlay rows via `create_run_v2` RPC |
| `schemas` | POST | Upload schema JSON artifact |
| `export-jsonl` | GET | Generate JSONL export for a run or conv_uid |
| `test-api-key` | POST | Verify Anthropic API key validity |

## Deep dives

- [Parsing Tracks](/docs/architecture/parsing-tracks/) — mdast, Docling, and Pandoc: how documents become blocks
- [Worker Protocol](/docs/architecture/worker-protocol/) — Batched processing: packs, claiming, prompt caching
- [Data Model](/docs/architecture/data-model/) — Tables, relationships, RPCs, deterministic UIDs
- [Staging Layer](/docs/architecture/staging-layer/) — Two-column model, confirmation RPCs, audit trail
