# AFFiNE Codebase Analysis

> Analysis of AFFiNE at `e:\writing-system\AFFiNE\` for integration/extension purposes.

---

## Table of Contents

1. [Knowledge Graph Integration](#1-knowledge-graph-integration)
2. [Vector Embeddings System](#2-vector-embeddings-system)
3. [Extension Entry Points](#3-extension-entry-points)
4. [Block Architecture](#4-block-architecture)
5. [Downloaded App vs Self-Hosted](#5-downloaded-app-vs-self-hosted)
6. [Local Storage Implementation](#6-local-storage-implementation)
7. [AI/Copilot Requirements](#7-aicopilot-requirements)
8. [Self-Hosting Guide](#8-self-hosting-guide)
9. [AFFiNE Cloud AI Models](#9-affine-cloud-ai-models)

---

## 1. Knowledge Graph Integration

**Reality check:** AFFiNE uses a **reference-based linking system**, not a traditional knowledge graph database. Relationships are stored as indexed fields in blocks.

### Entry Points for Extension

| Component | File | Lines |
|-----------|------|-------|
| Schema definition | `packages/common/nbstore/src/storage/indexer/schema.ts` | 1-52 |
| Reference types | `blocksuite/affine/model/src/consts/doc.ts` | 52-59 |
| Backlinks service | `packages/frontend/core/src/modules/doc-link/entities/doc-backlinks.ts` | 19-157 |
| Forward links | `packages/frontend/core/src/modules/doc-link/entities/doc-links.ts` | 6-24 |
| Backend indexer | `packages/backend/server/src/plugins/indexer/service.ts` | 253-275 |

### Key Fields in Block Table

```typescript
refDocId        // ['docA', 'docB'] - target doc IDs
ref             // JSON: {docId, mode, blockIds, elementIds}
parentBlockId   // hierarchy
parentFlavour   // block type relationships
```

**To extend:** Add new relationship types in `ReferenceInfo` at `doc.ts:52-59`, then update indexer at `block.ts`.

---

## 2. Vector Embeddings System

### Architecture

```
Document → Rust Native Parser → Token Splitter (7168 tokens)
→ External LLM API (Gemini/OpenAI) → 1024-dim vectors
→ PostgreSQL pgvector (HNSW index) → Cosine similarity search
→ LLM re-ranking → Top-K results
```

### Chunking Logic (Three Layers)

| Layer | Location | Strategy |
|-------|----------|----------|
| Native Rust | `packages/common/native/src/doc_loader/splitter/options.rs:11-34` | 7168 tokens, 128 overlap, cl100k_base tokenizer |
| Block-level | `packages/common/native/src/doc_parser/read/mod.rs:74-84` | Implicit by block type (paragraph, list, etc.) |
| Batch grouping | `packages/backend/server/src/plugins/copilot/embedding/types.ts:136-142` | 128 chunks per API call |

**Chunk enrichment** at `job.ts:370-384` - prepends title, dates, authors to each chunk.

### Embedding Model Connection

**External service** - not inline.

| Provider | File | Lines | Models |
|----------|------|-------|--------|
| Default | `plugins/copilot/embedding/client.ts` | 25 | `gemini-embedding-001` |
| OpenAI | `plugins/copilot/providers/openai.ts` | 776-810 | `text-embedding-3-large/small` |
| Gemini | `plugins/copilot/providers/gemini/generative.ts` | 79-84 | `gemini-embedding-001` |

**Generation entry:** `client.ts:68-94` `getEmbeddings()`

### Storage & Retrieval

**Storage:** PostgreSQL with pgvector extension

| Table | Purpose |
|-------|---------|
| `ai_workspace_embeddings` | Document embeddings |
| `ai_workspace_file_embeddings` | File embeddings |
| `ai_workspace_blob_embeddings` | Blob embeddings |
| `ai_context_embeddings` | Session-specific embeddings |

**Schema:** `packages/backend/server/schema.prisma:499-528`

**HNSW index migration:** `migrations/20250210090228_ai_context_embedding/migration.sql`

**Retrieval queries:**

| Type | File | Lines |
|------|------|-------|
| Doc search | `models/copilot-context.ts` | 330-357 |
| File search | `models/copilot-workspace.ts` | 384-414 |
| Combined | `plugins/copilot/context/service.ts` | 222-286 |

**Re-ranking:** `client.ts:104-206` - LLM scores results, filters >0.5 confidence.

---

## 3. Extension Entry Points

### Add New Embedding Provider

1. Create provider in `packages/backend/server/src/plugins/copilot/providers/`
2. Register in `factory.ts`
3. Update `config.ts:55`

### Modify Chunking

1. Rust splitter options: `packages/common/native/src/doc_loader/splitter/options.rs:11-34`
2. TypeScript batch size: `packages/backend/server/src/plugins/copilot/embedding/types.ts:136-142`

### Add Semantic Search Tool

1. Copy pattern from `packages/backend/server/src/plugins/copilot/tools/doc-semantic-search.ts`
2. Register in copilot module

### Change Vector Dimensions

1. Update `models/common/copilot.ts:152` `EMBEDDING_DIMENSIONS`
2. Run new migration for pgvector schema

### Evaluation

**Good fit if:**
- You want block-based document storage with bidirectional linking
- You need production-grade RAG with external embedding services
- You're building on PostgreSQL and want pgvector integration
- You need multi-provider LLM support (OpenAI, Anthropic, Gemini)

**Gaps to consider:**
- No native graph database (Neo4j, etc.) - just indexed references
- Embedding generation requires external API calls (no local models)
- Chunking is token-based, not semantic-boundary-aware beyond markdown
- Re-ranking adds latency (LLM call per search)

---

## 4. Block Architecture

### Definition

A **Block** in AFFiNE/BlockSuite is:

| Aspect | Definition |
|--------|------------|
| **Data structure** | A Y.js Map (CRDT) with system props (`sys:id`, `sys:flavour`, `sys:children`) and user props (`prop:*`) |
| **Identity** | Unique `id` + `flavour` (type identifier like `affine:paragraph`) |
| **Hierarchy** | Tree structure - blocks have parent/children relationships validated by schema |
| **Role** | `root` (one per doc), `hub` (container), or `content` (regular block) |

### Core Class

**File:** `blocksuite/framework/store/src/model/block/block-model.ts:17-158`

```typescript
export class BlockModel<Props extends object = object> {
  id!: string;
  schema!: BlockSchemaType;
  yBlock!: YBlock;              // Y.js Map for CRDT sync

  get flavour(): string;        // Block type (e.g., 'affine:paragraph')
  get children();               // Child BlockModels
  get parent();                 // Parent BlockModel
  get role();                   // 'root', 'hub', or 'content'
  get props();                  // Dynamic properties
}
```

### Y.js Integration

**File:** `blocksuite/framework/store/src/model/block/types.ts:6-23`

```typescript
export type YBlock = Y.Map<unknown> & {
  get(prop: 'sys:id' | 'sys:flavour'): string;
  get(prop: 'sys:children'): Y.Array<string>;
  get<T = unknown>(prop: string): T;
};
```

**Property naming:**
- `sys:id` - Block unique identifier
- `sys:flavour` - Block type
- `sys:children` - Y.Array<string> of child block IDs
- `prop:*` - User properties (e.g., `prop:text`, `prop:type`)

### Common Block Flavours

| Flavour | Role | File |
|---------|------|------|
| `affine:page` | root | `blocks/root/root-block-model.ts:53-63` |
| `affine:note` | hub | `blocks/note/note-model.ts:55-80` |
| `affine:paragraph` | content | `blocks/paragraph/paragraph-model.ts:29-56` |
| `affine:list` | content | `blocks/list/list-model.ts:24-55` |
| `affine:database` | hub | `blocks/database/database-model.ts:24-40` |
| `affine:image` | content | - |
| `affine:code` | content | - |
| `affine:bookmark` | content | - |

### Schema Definition Example

**File:** `blocksuite/affine/model/src/blocks/paragraph/paragraph-model.ts:29-56`

```typescript
export const ParagraphBlockSchema = defineBlockSchema({
  flavour: 'affine:paragraph',
  props: (internal): ParagraphProps => ({
    type: 'text',
    text: internal.Text(),
    collapsed: false,
  }),
  metadata: {
    version: 1,
    role: 'content',
    parent: ['affine:note', 'affine:database', 'affine:paragraph', ...],
  },
});
```

---

## 5. Downloaded App vs Self-Hosted

### Verified Differences

| Feature | Downloaded (Cloud) | Downloaded (Local Mode) | Self-Hosted |
|---------|-------------------|------------------------|-------------|
| **Document Storage** | Local + Cloud sync | Local only (IndexedDB/SQLite) | Local + Your PostgreSQL |
| **AI/Copilot** | Via AFFiNE cloud API | **Disabled** | Your own API keys |
| **Embeddings/RAG** | AFFiNE servers | **Not available** | Your pgvector |
| **Collaboration** | WebSocket via AFFiNE | BroadcastChannel (same device) | Your WebSocket server |
| **Sharing/Public docs** | Yes | No | Yes |
| **Search indexing** | Cloud indexer | Local IndexedDB indexer | Your ManticoreSearch |

### Verification Evidence

| Claim | Evidence |
|-------|----------|
| Local mode disables AI | `packages/frontend/core/src/components/hooks/affine/use-enable-ai.ts:5-14` - requires both `enable_ai` flag AND `serverConfig.copilot` |
| Embeddings require backend | `packages/backend/server/src/models/copilot-workspace.ts:291-296` - checks for 3 PostgreSQL tables |
| Self-hosted gets empty features by default | `packages/frontend/core/src/modules/cloud/constant.ts:18-22` - `features: []` for selfhosted |
| AI always hits server API | `packages/frontend/core/src/blocksuite/ai/provider/copilot-client.ts:460-501` - all requests to `/api/copilot/*` |

### Feature Gating

**Server Features Enum** (from `constant.ts`):
- `ServerFeature.Indexer`
- `ServerFeature.Copilot`
- `ServerFeature.CopilotEmbedding`
- `ServerFeature.OAuth`
- `ServerFeature.Payment`
- `ServerFeature.LocalWorkspace`

**Self-hosted default:** `features: []` (empty - must enable manually)

---

## 6. Local Storage Implementation

### Storage Backends by Platform

| Platform | Doc Storage | Blob Storage |
|----------|-------------|--------------|
| Web | IndexedDB | IndexedDB |
| Electron (Desktop) | SQLite | SQLite |
| iOS/Android | SQLite | SQLite |

### IndexedDB Schema

**File:** `packages/common/nbstore/src/impls/idb/schema.ts:1-280`

**Tables:**
- `snapshots` - Latest document state with timestamps
- `updates` - Incremental Y.js updates awaiting merge
- `clocks` - Document update timestamps
- `blobs` - Blob metadata
- `blobData` - Binary file content
- `peerClocks` - Sync state with peers
- `indexerRecords` - Search index data

### Y.js Persistence Strategy

**File:** `packages/common/nbstore/src/storage/doc.ts:131-164`

1. Y.js generates binary updates (Uint8Array) from changes
2. Updates stored in `updates` table with timestamps
3. On access, updates merged into single snapshot
4. Snapshot stored, updates marked as merged

### Cross-Tab Sync

**File:** `packages/common/nbstore/src/impls/broadcast-channel/awareness.ts:1-153`

- Uses **BroadcastChannel API** for same-device tab sync
- Channel name: `'idb:' + dbName`

### Cloud vs Local Workspace Storage

**Local Workspace** (`packages/frontend/core/src/modules/workspace-engine/impls/local.ts:88-120`):
```
Doc: IndexedDBDocStorage / SqliteDocStorage
Blob: IndexedDBBlobStorage / SqliteBlobStorage
Awareness: BroadcastChannelAwarenessStorage
```

**Cloud Workspace** (`packages/frontend/core/src/modules/workspace-engine/impls/cloud.ts:111-143`):
```
Local Cache: Same as local
Remote: CloudDocStorage + CloudBlobStorage (Socket.io)
Awareness: CloudAwarenessStorage (WebSocket)
```

---

## 7. AI/Copilot Requirements

### Can Embeddings Work Without Backend?

**No.** Requires PostgreSQL with embedding tables.

**Evidence:** `packages/backend/server/src/models/copilot-context.ts:152-157`

```typescript
async checkEmbeddingAvailable(): Promise<boolean> {
  const [{ count }] = await this.db.$queryRaw`
    SELECT count(1) FROM pg_tables
    WHERE tablename in ('ai_context_embeddings', 'ai_workspace_embeddings')
  `;
  return Number(count) === 2;
}
```

### Does Downloaded App Use AFFiNE Cloud API?

**Yes.** All AI requests go through `/api/copilot/*` endpoints.

**Evidence:** `packages/frontend/core/src/blocksuite/ai/provider/copilot-client.ts:460-501`

### What Happens in Local-Only Mode?

**AI features are disabled.**

**Evidence:** `packages/frontend/core/src/components/hooks/affine/use-enable-ai.ts:5-14`

```typescript
export const useEnableAI = () => {
  const aiFeature = useLiveData(featureFlagService.flags.enable_ai.$);
  const aiConfig = serverConfig.copilot;  // Requires server
  return aiFeature && aiConfig;           // Both must be true
};
```

---

## 8. Self-Hosting Guide

### Quick Start (Docker)

```bash
cd e:\writing-system\AFFiNE

# Copy config
cp .docker/selfhost/.env.example .docker/selfhost/.env

# Edit .env - set DB_PASSWORD
# Edit config location for copilot API keys

# Start
docker compose -f .docker/selfhost/compose.yml up -d
```

### Services Started

| Service | Image | Port |
|---------|-------|------|
| AFFiNE Server | `ghcr.io/toeverything/affine:stable` | 3010 |
| PostgreSQL | `pgvector/pgvector:pg16` | 5432 |
| Redis | `redis:latest` | 6379 |

### Enable AI/Copilot

Create `~/.affine/self-host/config/config.json`:

```json
{
  "copilot": {
    "enabled": true,
    "providers.openai": {
      "apiKey": "sk-..."
    },
    "providers.gemini": {
      "apiKey": "..."
    }
  },
  "indexer": {
    "enabled": true
  }
}
```

### Development Setup (Full Source)

See earlier in conversation for complete dev setup with:
- Node.js + Rust toolchain
- Native package builds
- Docker dev services (postgres, redis, mailpit, manticoresearch)

---

## 9. AFFiNE Cloud AI Models

When using downloaded app with AFFiNE Cloud account:

**From:** `.docker/selfhost/schema.json:908-922`

| Scenario | Model |
|----------|-------|
| Chat | `gemini-2.5-flash` |
| Coding | `claude-sonnet-4-5@20250929` |
| Embedding | `gemini-embedding-001` |
| Rerank | `gpt-4.1` |
| Image generation | `gpt-image-1` |
| Audio transcription | `gemini-2.5-flash` |
| Complex text | `gpt-4o-2024-08-06` |
| Quick decisions | `gpt-5-mini` |
| Polish/summarize | `gemini-2.5-flash` |

**What this means:**
- AFFiNE pays for API calls
- You get access based on subscription tier
- Rate limits managed by them
- Their embeddings in their pgvector

---

## Key File References

### Backend
- `packages/backend/server/src/plugins/copilot/` - AI/Copilot system
- `packages/backend/server/src/plugins/indexer/` - Search indexing
- `packages/backend/server/src/models/` - Database models
- `packages/backend/server/schema.prisma` - Database schema

### Frontend
- `packages/frontend/core/src/modules/` - Feature modules
- `packages/frontend/core/src/blocksuite/ai/` - AI integration
- `packages/common/nbstore/` - Storage implementations

### BlockSuite
- `blocksuite/framework/store/src/model/block/` - Block system
- `blocksuite/affine/model/src/blocks/` - Block type definitions

### Native (Rust)
- `packages/common/native/src/doc_loader/` - Document parsing
- `packages/common/native/src/doc_parser/` - Block extraction
