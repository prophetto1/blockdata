# Platform Integration Architecture: Connectors, Functions & Admin Shell

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Establish the platform's integration architecture across two parallel tracks — a JavaScript connector service (for external database connections and query execution) and a Python functions/services layer (for data operations once on-platform) — plus a cleanly separated admin shell in the frontend, all modeled after Evidence Studio's organizational patterns.

**Architecture:** Four-layer split. (1) Connector service in Node/JS migrated from Evidence's MIT-licensed codebase — handles database connections, schema introspection, query execution. (2) Functions/services in Python — the Kestra-translated 2,300+ operation stubs, executing transforms, loads, extractions once data is on-platform. (3) Platform-api in Python/FastAPI — orchestration, auth, permissions, tenant isolation, routing between the two. (4) React frontend — admin shell (Evidence Studio-style), connector page, SQL console, workspace.

**Tech Stack:**
- Connector service: Node.js, Evidence datasource packages (`@evidence-dev/postgres`, etc.), CommonJS
- Functions layer: Python 3.11+, Kestra-translated stubs, plugin runtime substrate
- Platform API: Python/FastAPI (existing)
- Frontend: React, TypeScript, Ark UI/shadcn (existing)

---

## Background Context (for new team members)

This section explains how we arrived at this plan. Read it before touching any code.

### Why We're Here

The platform needs to connect to external databases (Postgres, BigQuery, Snowflake, etc.) and also execute hundreds of data operations (parse, transform, extract, load) on data that's already landed on the platform. These are two fundamentally different jobs:

- **Connectors** talk to external databases — run queries, introspect schemas, test connections. Think: "connect my Snowflake warehouse so I can query it."
- **Functions/services** operate on data already on-platform — parse a PDF, transform a JSON document, load records into ArangoDB. Think: "take this uploaded file and extract structured data from it."

We studied several open-source platforms to find the right architectural patterns:

### What We Studied

**Metabase** (AGPL — study only, cannot take code)
- Best-in-class visual query builder ("notebook editor") with 85+ expression functions
- Backend architecture: pMBQL (query AST) → 26 preprocessing middleware steps → HoneySQL → driver-specific SQL → 16 post-processing steps
- Driver hierarchy: `driver → sql → sql-jdbc → postgres` with ~80 multimethods per driver and ~100 feature flags
- Database wizard: pick type → fill config → save → three-phase bootstrap (schema sync, fingerprinting, field value scan)
- Multi-tenant model: group-based permissions, collection hierarchy, JWT tenant provisioning
- **Key insight:** Metabase's visual query builder is NOT replicable with open-source React query builder libraries (react-querybuilder, react-awesome-query-builder). Those cover ~5-15% of Metabase's surface — they're WHERE clause builders only. The full notebook editor (aggregation, joins, multi-stage pipeline, expressions, drill-through) must be custom-built.

**Evidence** (MIT — can take code)
- Clean connector architecture: each database adapter is a single JS file implementing `getRunner()`, `testConnection()`, and a declarative `options` schema
- 14 open-source database connectors + shared `db-commons` utilities
- Evidence Studio (cloud product, closed-source) has an excellent admin UI that we're using as our design reference
- SaaS application connectors (Stripe, HubSpot, etc.) are powered by Fivetran — not Evidence's own code
- Object storage connectors query Parquet files in-place (no data movement)
- **Key insight:** Evidence's connector pattern is simple, clean, and directly migrateable. Single-file adapters with a tiny contract.

**Apache Superset** (Apache 2.0 — can take code)
- SQLAlchemy-based driver system, Python + React
- Full database wizard, chart builder, dashboards
- Alternative source for connector patterns if needed

**React Query Builder Libraries** (MIT)
- `react-querybuilder` (~200K weekly downloads) and `react-awesome-query-builder` (~31K downloads)
- Both are filter/WHERE clause builders only — no aggregation, joins, grouping, expressions
- Useful as a component inside a filter step, but not a replacement for a full query builder

### Reference Materials

**Evidence Studio** (our admin shell design reference):
- URL: https://evidence.studio
- Screenshots saved in `docs/screenshot/`:
  - `image copy.png` — Organization settings (name, logo, domain, SSO, audit logs)
  - `image copy 2.png` — AI Agent settings (chat toggle, usage pricing, query execution, custom instructions)
  - `image copy 3.png` — Theme settings (background, card colors, chart palette, color scale)
  - `image.png` — Connectors page (categorized list: Files, Databases, Object Storage, Data Lakes, Applications)
  - `image2.png` — SQL Console (sources tree, SQL editor, results table)

**Evidence open-source repos** (MIT, code we can use):
- Main repo: https://github.com/evidence-dev/evidence
  - Database connectors: `packages/datasources/` (14 connectors)
  - Shared DB utilities: `packages/lib/db-commons/`
  - UI components: `packages/ui/core-components/src/lib/organisms/source-config/`
  - Plugin SDK: `packages/lib/sdk/src/plugins/datasources/`
- Datasource template: https://github.com/evidence-dev/datasource-template
- Additional datasources: https://github.com/evidence-dev/datasources (Google Sheets, InfluxDB)

**Metabase** (architecture reference only — AGPL, no code borrowing):
- Local clone: `/e/metabase`
- Cloud instance: https://stark-outrigger.metabaseapp.com
- Docs: https://www.metabase.com/docs/latest/

**Kestra** (source for function translations):
- Core repo: `E:/KESTRA`
- Plugin IO repo: `E:/KESTRA-IO`
- Our translations: `E:/writing-system/integrations/` (125 services, 2,300+ classes in `.registry.json`)

### Our Current State

**Frontend:**
- Single `AppLayout` shell serves all authenticated routes (`/app/*`)
- Workspace (`/app/workspace`) hacks the shared shell via `workspaceShellMode` flag
- Admin (`/app/superuser/*`) behind `SuperuserGuard` but uses same shell
- Need: three distinct shells (app, admin, workspace)

**Backend:**
- `platform-api` (Python/FastAPI) handles auth, orchestration, plugin execution
- Plugin runtime substrate plan exists (`docs/plans/2026-03-16-plugin-runtime-substrate.md`) — 6 missing services before plugins can execute
- Kestra integration stubs exist (2,300+ Python dataclasses) but all raise `NotImplementedError`
- No database connector service exists yet

**Integrations registry:**
- `integrations/.registry.json` (27,641 lines) indexes all translated Kestra plugins
- Each stub has source reference back to Java source in `E:/KESTRA-IO`

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend                           │
│  ┌──────────┐  ┌──────────────┐  ┌───────────┐  ┌───────────┐ │
│  │ Admin    │  │ Connector    │  │ SQL       │  │ Workspace │ │
│  │ Shell    │  │ Page         │  │ Console   │  │ (Data     │ │
│  │ (settings│  │ (categorized │  │ (query    │  │  Studio)  │ │
│  │  theme,  │  │  list, config│  │  editor,  │  │           │ │
│  │  team,   │  │  forms, test)│  │  results) │  │           │ │
│  │  access) │  │              │  │           │  │           │ │
│  └──────────┘  └──────────────┘  └───────────┘  └───────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────────────────┐
│                    Platform API (Python/FastAPI)                 │
│         Auth · Permissions · Tenant Isolation · Routing         │
└──────────┬──────────────────────────────────┬───────────────────┘
           │                                  │
┌──────────▼──────────┐          ┌────────────▼────────────────┐
│  Connector Service  │          │   Functions / Services       │
│  (Node.js)          │          │   (Python)                   │
│                     │          │                              │
│  Evidence-migrated  │          │  Kestra-translated stubs     │
│  database adapters  │          │  2,300+ operations across    │
│                     │          │  125 services                │
│  • getRunner()      │          │                              │
│  • testConnection() │          │  • parse, extract, transform │
│  • options schema   │          │  • load, convert, validate   │
│                     │          │  • AWS, GCP, Azure, MongoDB  │
│  14 DB connectors   │          │  • file I/O, batch, stream   │
│  + object storage   │          │                              │
│  + data lakes       │          │  Depends on: Plugin Runtime  │
│                     │          │  Substrate (6 services)      │
└─────────────────────┘          └──────────────────────────────┘
```

### What Connects to What (Post-Data-Landing)

Once a database is connected OR data lands on the platform, these features activate:

```
Database Connected                    Data On Platform
       │                                    │
       ├→ Schema Browser (tables,           ├→ Parse artifacts available
       │   columns, types, FKs)             ├→ Extract/transform pipeline
       ├→ SQL Console (live queries)        ├→ Models (curated datasets)
       ├→ Visual Query Builder              ├→ Schema/type detection
       │   (filter, aggregate, join,        ├→ Search indexing
       │    expressions, drill-through)     ├→ Version history
       ├→ Metadata editing (display         ├→ Export (download, API)
       │   names, descriptions, types)      └→ Alerts/subscriptions
       ├→ Models (derived tables)
       ├→ Dashboards
       ├→ Caching policies
       ├→ Permissions (per DB/schema/table)
       └→ Sync scheduling
```

---

## Track 1: Connector Service (Node.js) — PRIORITY

Migrate Evidence's MIT-licensed database connectors into a standalone Node microservice that platform-api calls into.

### Evidence Connector Contract (what we're migrating)

Every connector exports three things:

```javascript
// 1. Declarative config schema — generates UI forms automatically
module.exports.options = {
  host: { title: 'Host', type: 'string', required: true, default: 'localhost' },
  port: { title: 'Port', type: 'number', required: true, default: 5432 },
  database: { title: 'Database', type: 'string', required: true },
  user: { title: 'Username', type: 'string', required: true },
  password: { title: 'Password', type: 'string', secret: true, required: true },
  ssl: {
    title: 'Enable SSL', type: 'boolean', default: false,
    nest: true,
    children: {
      true: {
        rejectUnauthorized: { title: 'Reject Unauthorized', type: 'boolean', default: true }
      }
    }
  }
};

// 2. Test connection — run SELECT 1, return true or { reason }
module.exports.testConnection = async (opts) => {
  return await runQuery('SELECT 1;', opts, 1, true)
    .then(exhaustStream)
    .then(() => true)
    .catch((e) => ({ reason: e.message }));
};

// 3. Query runner factory — returns function that executes SQL and returns typed rows
module.exports.getRunner = (opts) => {
  return async (queryContent, queryPath, batchSize) => {
    // skip non-SQL files
    if (!queryPath.endsWith('.sql')) return null;
    return await runQuery(queryContent, opts, batchSize);
  };
};
```

Results return as:
```javascript
{
  rows: Record<string, unknown>[] | AsyncGenerator<Record<string, unknown>[]>,
  columnTypes: [{ name: 'column', evidenceType: 'string'|'number'|'boolean'|'date', typeFidelity: 'precise'|'inferred' }],
  expectedRowCount?: number
}
```

### Task 1.1: Scaffold the Connector Service

**Files:**
- Create: `services/connector-service/package.json`
- Create: `services/connector-service/src/index.js` (Express/Fastify HTTP server)
- Create: `services/connector-service/src/routes/connections.js`
- Create: `services/connector-service/src/routes/query.js`
- Create: `services/connector-service/.env.example`
- Create: `services/connector-service/Dockerfile`

**Step 1: Initialize the Node project**

```bash
cd services
mkdir -p connector-service/src/routes connector-service/src/connectors
cd connector-service
npm init -y
npm install express cors helmet dotenv
npm install -D nodemon
```

**Step 2: Create the HTTP server**

`services/connector-service/src/index.js`:
```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'] }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Routes
app.use('/api/connections', require('./routes/connections'));
app.use('/api/query', require('./routes/query'));

const PORT = process.env.PORT || 3100;
app.listen(PORT, () => console.log(`Connector service on :${PORT}`));
```

**Step 3: Create the connections route**

`services/connector-service/src/routes/connections.js`:
```javascript
const express = require('express');
const router = express.Router();
const { getConnector, listConnectors } = require('../connectors');

// List available connector types
router.get('/types', (req, res) => {
  res.json(listConnectors());
});

// Get config schema for a connector type
router.get('/types/:type/options', (req, res) => {
  const connector = getConnector(req.params.type);
  if (!connector) return res.status(404).json({ error: 'Unknown connector type' });
  res.json(connector.options);
});

// Test a connection
router.post('/test', async (req, res) => {
  const { type, config } = req.body;
  const connector = getConnector(type);
  if (!connector) return res.status(404).json({ error: 'Unknown connector type' });
  try {
    const result = await connector.testConnection(config);
    if (result === true) {
      res.json({ success: true });
    } else {
      res.json({ success: false, reason: result.reason });
    }
  } catch (e) {
    res.status(500).json({ success: false, reason: e.message });
  }
});

module.exports = router;
```

**Step 4: Create the query route**

`services/connector-service/src/routes/query.js`:
```javascript
const express = require('express');
const router = express.Router();
const { getConnector } = require('../connectors');
const { exhaustStream } = require('@evidence-dev/db-commons');

// Execute a query against a connection
router.post('/execute', async (req, res) => {
  const { type, config, query, batchSize = 10000 } = req.body;
  const connector = getConnector(type);
  if (!connector) return res.status(404).json({ error: 'Unknown connector type' });
  try {
    const runner = connector.getRunner(config);
    const result = await runner(query, 'query.sql', batchSize);
    if (!result) return res.json({ rows: [], columnTypes: [] });

    // If rows is a generator, materialize it
    let rows = result.rows;
    if (typeof rows === 'function') {
      const batches = [];
      for await (const batch of rows()) {
        batches.push(...batch);
      }
      rows = batches;
    }

    res.json({
      rows,
      columnTypes: result.columnTypes,
      rowCount: result.expectedRowCount || rows.length
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
```

**Step 5: Create the connector registry**

`services/connector-service/src/connectors/index.js`:
```javascript
const connectors = {};

function register(name, aliases, mod) {
  connectors[name] = mod;
  for (const alias of aliases) {
    connectors[alias] = mod;
  }
}

// Register Evidence connectors as they're migrated
// Task 1.2 will add these one by one

module.exports = {
  getConnector: (type) => connectors[type.toLowerCase()] || null,
  listConnectors: () => {
    const seen = new Set();
    return Object.entries(connectors)
      .filter(([name, mod]) => {
        if (seen.has(mod)) return false;
        seen.add(mod);
        return true;
      })
      .map(([name, mod]) => ({
        type: name,
        options: mod.options
      }));
  },
  register
};
```

**Step 6: Add scripts to package.json**

```json
{
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js",
    "test": "jest"
  }
}
```

**Step 7: Commit**
```bash
git add services/connector-service/
git commit -m "feat: scaffold connector service (Node/Express)"
```

---

### Task 1.2: Migrate Postgres Connector (first connector)

**Files:**
- Create: `services/connector-service/src/connectors/postgres.js`
- Modify: `services/connector-service/src/connectors/index.js`
- Modify: `services/connector-service/package.json` (add pg, pg-cursor)

**Step 1: Install dependencies**

```bash
cd services/connector-service
npm install pg pg-cursor @evidence-dev/db-commons
```

**Step 2: Copy and adapt the Evidence Postgres connector**

Source: `https://github.com/evidence-dev/evidence/blob/main/packages/datasources/postgres/index.cjs`

Copy the file to `services/connector-service/src/connectors/postgres.js`. Key adaptations:
- Remove Evidence-specific source directory walking (we call it via HTTP, not file system)
- Keep: `options`, `testConnection`, `getRunner`, `runQuery`, type mappings
- Keep: the `nativeTypeToEvidenceType()` mapping function
- Keep: cursor-based streaming for large result sets
- Keep: SSL configuration handling

**Step 3: Register in connector index**

Add to `services/connector-service/src/connectors/index.js`:
```javascript
const postgres = require('./postgres');
register('postgres', ['postgresql', 'pg', 'pgsql', 'psql'], postgres);
```

**Step 4: Write integration test**

Create `services/connector-service/src/connectors/__tests__/postgres.test.js`:
```javascript
const postgres = require('../postgres');

describe('Postgres connector', () => {
  test('exports required interface', () => {
    expect(postgres.options).toBeDefined();
    expect(postgres.testConnection).toBeInstanceOf(Function);
    expect(postgres.getRunner).toBeInstanceOf(Function);
  });

  test('options schema has required fields', () => {
    expect(postgres.options.host).toBeDefined();
    expect(postgres.options.port).toBeDefined();
    expect(postgres.options.database).toBeDefined();
    expect(postgres.options.user).toBeDefined();
    expect(postgres.options.password).toBeDefined();
  });

  // Integration test (requires running Postgres)
  test.skip('testConnection succeeds with valid config', async () => {
    const result = await postgres.testConnection({
      host: 'localhost',
      port: 5432,
      database: 'test',
      user: 'postgres',
      password: 'postgres'
    });
    expect(result).toBe(true);
  });
});
```

**Step 5: Run tests**
```bash
npm test -- --testPathPattern=postgres
```

**Step 6: Commit**
```bash
git add services/connector-service/
git commit -m "feat: migrate Evidence Postgres connector"
```

---

### Task 1.3: Migrate Remaining Database Connectors

Repeat the pattern from Task 1.2 for each connector. Each is a single-file migration:

| Priority | Connector | npm packages needed | Evidence source |
|----------|-----------|-------------------|-----------------|
| 1 | MySQL | `mysql2` | `packages/datasources/mysql/index.cjs` |
| 2 | BigQuery | `@google-cloud/bigquery` | `packages/datasources/bigquery/index.cjs` |
| 3 | Snowflake | `snowflake-sdk` | `packages/datasources/snowflake/index.cjs` |
| 4 | MSSQL | `mssql` | `packages/datasources/mssql/index.cjs` |
| 5 | SQLite | `better-sqlite3` | `packages/datasources/sqlite/index.cjs` |
| 6 | DuckDB | `duckdb` | `packages/datasources/duckdb/index.cjs` |
| 7 | Redshift | (uses pg) | `packages/datasources/redshift/index.cjs` |
| 8 | Databricks | `@databricks/sql` | `packages/datasources/databricks/index.cjs` |
| 9 | Trino | `trino-client` | `packages/datasources/trino/index.cjs` |
| 10 | CSV | (uses duckdb) | `packages/datasources/csv/index.cjs` |

For each:
1. Copy the Evidence source file
2. Install the npm database client
3. Register in connector index with aliases
4. Write interface test (exports check + options schema check)
5. Commit

**Step: Commit after all connectors migrated**
```bash
git commit -m "feat: migrate all 14 Evidence database connectors"
```

---

### Task 1.4: Platform-API ↔ Connector Service Bridge

**Files:**
- Create: `services/platform-api/app/infra/connector_client.py`
- Modify: `services/platform-api/app/api/routes/connections.py` (ALREADY EXISTS — extend, don't replace. Current file handles generic connection CRUD with encrypted credential storage. Add connector-service proxy endpoints alongside existing routes.)
- Modify: `services/platform-api/app/api/routes/__init__.py` (connections router already registered — verify)

**Step 1: Create the HTTP client for connector service**

`services/platform-api/app/infra/connector_client.py`:
```python
import httpx
import os

CONNECTOR_SERVICE_URL = os.getenv("CONNECTOR_SERVICE_URL", "http://localhost:3100")

async def list_connector_types() -> list[dict]:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{CONNECTOR_SERVICE_URL}/api/connections/types")
        resp.raise_for_status()
        return resp.json()

async def get_connector_options(connector_type: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{CONNECTOR_SERVICE_URL}/api/connections/types/{connector_type}/options")
        resp.raise_for_status()
        return resp.json()

async def test_connection(connector_type: str, config: dict) -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{CONNECTOR_SERVICE_URL}/api/connections/test",
            json={"type": connector_type, "config": config}
        )
        resp.raise_for_status()
        return resp.json()

async def execute_query(connector_type: str, config: dict, query: str, batch_size: int = 10000) -> dict:
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            f"{CONNECTOR_SERVICE_URL}/api/query/execute",
            json={"type": connector_type, "config": config, "query": query, "batchSize": batch_size}
        )
        resp.raise_for_status()
        return resp.json()
```

**Step 2: Create the connections API route**

`services/platform-api/app/api/routes/connections.py`:
```python
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.infra.connector_client import (
    list_connector_types, get_connector_options, test_connection, execute_query
)

router = APIRouter(prefix="/connections", tags=["connections"])

class TestConnectionRequest(BaseModel):
    type: str
    config: dict

class ExecuteQueryRequest(BaseModel):
    type: str
    config: dict
    query: str
    batch_size: int = 10000

@router.get("/types")
async def get_types():
    return await list_connector_types()

@router.get("/types/{connector_type}/options")
async def get_options(connector_type: str):
    return await get_connector_options(connector_type)

@router.post("/test")
async def test(req: TestConnectionRequest):
    return await test_connection(req.type, req.config)

@router.post("/query")
async def query(req: ExecuteQueryRequest):
    return await execute_query(req.type, req.config, req.query, req.batch_size)
```

**Step 3: Register route in platform-api**

Add to `services/platform-api/app/api/routes/__init__.py`:
```python
from app.api.routes.connections import router as connections_router
# ... in the include_routers function:
app.include_router(connections_router)
```

**Step 4: Commit**
```bash
git commit -m "feat: platform-api bridge to connector service"
```

---

## Track 2: Functions / Services Layer (Python) — PRIORITY

This track is about getting the Kestra-translated function stubs operational. It depends on the Plugin Runtime Substrate (`docs/plans/2026-03-16-plugin-runtime-substrate.md`).

### Current State

- **2,300+ classes** translated from Java → Python dataclasses across 125 services
- **All stubs** — method bodies raise `NotImplementedError`
- **Registry**: `integrations/.registry.json` (27,641 lines)
- **Blocker**: Plugin Runtime Substrate (6 missing services: file I/O, temp files, JSONL serialization, Jinja2 templates, auth providers, chunked batch processing)
- **Base contract**: `RunnableTask.run(run_context) → Output`

### Task 2.1: Complete Plugin Runtime Substrate

**Prerequisite:** Execute the existing plan at `docs/plans/2026-03-16-plugin-runtime-substrate.md`.

This plan covers 7 tasks:
1. File I/O on ExecutionContext (`download_file`, `list_files`, `delete_files`)
2. Temp file management (`create_temp_file`, `work_dir`, `cleanup`)
3. JSONL serialization (`encode_jsonl`, `decode_jsonl`, `iter_jsonl`, `chunked_write`)
4. Jinja2 template rendering
5. Auth providers (APIKey, Basic, OAuth2ServiceAccount, OAuth2ClientCredentials, IAM)
6. Refactor GCS + ArangoDB plugins onto substrate

**This must be completed before any function stub can be implemented.**

---

### Task 2.2: Implement First Function Batch (Database Operations)

After the substrate is in place, implement the database-related functions first — these connect directly to the connector service and are the most immediately useful.

**Priority functions to implement (method bodies):**

| Service | Function | What it does |
|---------|----------|-------------|
| JDBC | `Query` | Execute SQL query via connector service |
| JDBC | `FetchOne` | Execute query, return single row |
| JDBC | `FetchSize` | Execute query with batch size |
| MongoDB | `Find` | Query MongoDB collection |
| MongoDB | `Aggregate` | Run aggregation pipeline |
| MongoDB | `InsertOne` | Insert single document |
| Elasticsearch | `Search` | Run ES query |
| Redis | `Get` / `Set` | Key-value operations |

For each: read the Java source from `E:/KESTRA-IO`, translate the method body to Python using the runtime substrate services, write tests.

---

### Task 2.3: Implement File Operation Functions

| Service | Function | What it does |
|---------|----------|-------------|
| GCS | `Upload` | Upload file to Google Cloud Storage |
| GCS | `Download` | Download file from GCS |
| GCS | `List` | List objects in bucket |
| GCS | `Delete` | Delete object |
| S3 | `Upload` / `Download` / `List` / `Delete` | Same for AWS S3 |
| Azure Blob | `Upload` / `Download` / `List` / `Delete` | Same for Azure |
| FileSystem | `Read` / `Write` / `Copy` / `Move` / `Delete` | Local/platform file operations |

---

### Task 2.4: Implement Transform Functions

| Service | Function | What it does |
|---------|----------|-------------|
| Transform | `JSONPath` | Extract data using JSONPath expressions |
| Transform | `JQ` | JQ-style transformations |
| Transform | `CSV → JSON` | Format conversion |
| Transform | `JSON → CSV` | Format conversion |
| Transform | `Flatten` | Flatten nested structures |
| Transform | `Filter` | Filter rows by condition |
| Transform | `Map` | Apply function to each row |

---

## Track 3: Admin Shell & Connector Page (Frontend)

### Task 3.1: Create Admin Layout Route

**Files:**
- Create: `web/src/components/layout/AdminLayout.tsx`
- Modify: `web/src/router.tsx`
- Modify: `web/src/components/shell/nav-config.ts`

Separate the admin area into its own layout route with its own sidebar, modeled after Evidence Studio's settings sidebar:

```
Admin sidebar nav:
├── Organization (name, logo, domain)
├── AI Agent (chat, pricing, query execution)
├── Team (members, roles)
├── Customers (tenants — future)
├── Theme (colors, palette)
├── Access Rules (permissions)
├── Connectors (database connections — links to connector page)
├── Feature Requests (future)
├── Embedded (future)
└── Billing (future)
```

**Key design pattern from Evidence Studio:**
- Left sidebar: category navigation (icons + labels)
- Main content: description-left / controls-right layout per section
- Section dividers between groups
- Dark theme, clean typography

---

### Task 3.2: Build Connector Page

**Files:**
- Create: `web/src/pages/admin/ConnectorsPage.tsx`
- Create: `web/src/pages/admin/ConnectorConfigForm.tsx`
- Create: `web/src/pages/admin/ConnectorConfigField.tsx`
- Create: `web/src/pages/admin/ConnectorConfigSection.tsx`

The connector page displays all available integrations in a categorized list (Evidence Studio reference: `docs/screenshot/image.png`):

```
Categories:
├── Files (CSV, Parquet, JSON) → Upload action
├── Databases (Postgres, BigQuery, Snowflake, ...) → Connect action
├── Object Storage (GCS, S3, Azure Blob) → Connect action
├── Data Lakes (Iceberg, Delta Lake) → Connect action (future)
└── Applications (via Kestra functions) → Connect action (future)
```

Each category has:
- Section header with icon badges
- Description text
- "Request a ___" link for missing connectors
- List of connectors: icon + name + action button (Connect / Upload)
- "New" badges on recently added connectors

Clicking "Connect" opens the config form, dynamically generated from the connector's `options` schema (fetched from connector service via platform-api). The `nest`/`children` pattern enables conditional fields (e.g., SSL options appear only when SSL is toggled on).

---

### Task 3.3: Build SQL Console Page

**Files:**
- Create: `web/src/pages/admin/SQLConsole.tsx`

Reference: `docs/screenshot/image2.png`

Layout:
- Left panel: sources tree (connected databases, tables)
- Main panel: SQL editor (CodeMirror or Monaco)
- Bottom panel: results table with pagination
- Toolbar: Run button, Download CSV, execution time

Queries execute via: frontend → platform-api → connector service → database → results back up the chain.

---

## Dependency Order

```
Phase 1 (parallel):
  Track 1: Task 1.1 (scaffold) → 1.2 (postgres) → 1.3 (remaining DBs) → 1.4 (bridge)
  Track 2: Task 2.1 (runtime substrate) → 2.2 (DB functions) → 2.3 (file ops) → 2.4 (transforms)

Phase 2 (after both tracks have foundations):
  Track 3: Task 3.1 (admin layout) → 3.2 (connector page) → 3.3 (SQL console)

Phase 3 (future — not in this plan):
  - Visual query builder (custom build, Metabase architecture reference)
  - Schema browser / introspection
  - Models and dashboards
  - Multi-tenant storage isolation
```

---

## Key Decisions Made

1. **JavaScript for connectors, Python for functions** — connectors use Evidence's MIT code as-is; functions use Kestra translations in Python. Two languages, clean boundary.
2. **Connector service is a standalone Node microservice** — platform-api routes to it via HTTP. Clean separation of concerns.
3. **Evidence Studio as admin shell design reference** — dark theme, sidebar nav, description-left / controls-right layout. Not copying code (closed source), copying the organizational pattern.
4. **Evidence open-source connectors as code source** — 14 database adapters, MIT licensed, single-file each. Minimal adaptation needed.
5. **Metabase as architecture reference only** — AGPL, cannot take code. Study the query compilation pipeline (MBQL → SQL) and driver hierarchy pattern for when we build the visual query builder.
6. **React OSS query builders (react-querybuilder, react-awesome-query-builder) are filter-only** — cover ~5-15% of Metabase's visual QB. Not sufficient for our needs. The full query builder will be custom-built in a future plan.
7. **SaaS application connectors deferred** — Evidence uses Fivetran for these. We have Kestra stubs for many of the same services. Will implement via the functions layer, not a third-party ETL service.
