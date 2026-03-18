# Connector Service Migration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Stand up a Node.js connector service at `services/connector-service/` covering the full data integration surface — databases, object storage, data lakes, and flat files. Migrate Evidence's MIT-licensed connectors where available; build the rest using DuckDB extensions and cloud SDKs.

**Architecture:** Each connector exports three things: `options` (declarative config schema), `testConnection()`, and `getRunner()`. We wrap them in an Express HTTP server exposing: list types, test connection, execute query. Platform-api calls this service via HTTP.

**Tech Stack:** Node.js, Express, Evidence datasource packages (MIT), `@evidence-dev/db-commons`, DuckDB (httpfs, iceberg, delta extensions), AWS/GCP/Azure SDKs

**Not in scope:** Application connectors (Linear, Stripe, HubSpot, etc.) — these will use Kestra integration stubs, not this service.

---

## What We're Building

### Category 1: Databases — 16 connectors

| # | Connector | Source | npm client | Notes |
|---|-----------|--------|-----------|-------|
| 1 | PostgreSQL | Evidence OSS | `pg`, `pg-cursor` | Cursor-based streaming, SSL, schema |
| 2 | MySQL | Evidence OSS | `mysql2` | Stream-based, SSL, socket path |
| 3 | BigQuery | Evidence OSS | `@google-cloud/bigquery`, `google-auth-library` | 3 auth methods |
| 4 | Snowflake | Evidence OSS | `snowflake-sdk` | 4 auth methods, proxy support |
| 5 | MSSQL | Evidence OSS | `mssql` | Windows auth, Azure AD, encrypt |
| 6 | SQLite | Evidence OSS | `sqlite3`, `sqlite` | File-based, in-memory |
| 7 | DuckDB | Evidence OSS | `@duckdb/node-api` | In-memory analytics, Parquet/CSV |
| 8 | Databricks | Evidence OSS | `@databricks/sql` | Token auth, HTTP path |
| 9 | Trino | Evidence OSS | `presto-client` | Basic + custom auth |
| 10 | Redshift | Evidence OSS | (reuses postgres) | One-line re-export |
| 11 | MotherDuck | Evidence OSS | (reuses duckdb) | Token auth, delegates to DuckDB |
| 12 | CSV | Evidence OSS | (reuses duckdb) | DuckDB `read_csv()` auto-detection |
| 13 | Athena | Community (ISC) | `evidence-connector-aws-athena` | npm re-export |
| 14 | Azure SQL | Build (thin) | `mssql` | MSSQL + Azure AD auth options |
| 15 | RDS PostgreSQL | Build (thin) | `pg` | Postgres + IAM auth option |
| 16 | Azure Postgres | Build (thin) | `pg` | Postgres + Azure AD auth option |

**Evidence OSS connectors:** Each is a single `.cjs` file (~100-300 lines) in `https://github.com/evidence-dev/evidence/tree/main/packages/datasources/`. MIT licensed. Copy as-is except csv.js and motherduck.js which need one import path change.

**Skipped from Evidence OSS:** `faker` (test data generator) and `javascript` (arbitrary JS execution) — not needed.

### Category 2: Object Storage — 5 connectors

| # | Connector | npm client | Notes |
|---|-----------|-----------|-------|
| 17 | AWS S3 | `@aws-sdk/client-s3` | DuckDB httpfs queries Parquet/CSV in-place |
| 18 | Google Cloud Storage | `@google-cloud/storage` | DuckDB httpfs via GCS |
| 19 | Azure Blob Storage | `@azure/storage-blob` | DuckDB httpfs via Azure |
| 20 | Cloudflare R2 | `@aws-sdk/client-s3` | S3-compatible — reuse S3 with custom endpoint |
| 21 | Backblaze B2 | `@aws-sdk/client-s3` | S3-compatible — reuse S3 with custom endpoint |

**Note:** Evidence Studio uses ClickHouse's S3 table engine for these. We use DuckDB httpfs instead — simpler to deploy, no ClickHouse dependency.

### Category 3: Data Lakes — 2 connectors

| # | Connector | Mechanism | Notes |
|---|-----------|-----------|-------|
| 22 | Apache Iceberg | DuckDB `iceberg_scan()` | Connect to catalog → scan data files |
| 23 | Delta Lake | DuckDB `delta_scan()` | Point at storage path → scan Delta table |

### Category 4: Flat Files — 4 formats

| # | Connector | Mechanism | Notes |
|---|-----------|-----------|-------|
| 24 | CSV | DuckDB `read_csv()` | Already in Evidence OSS (connector #12 above) |
| 25 | Parquet | DuckDB `read_parquet()` | Build — thin wrapper |
| 26 | JSON / JSONL | DuckDB `read_json()` | Build — thin wrapper |
| 27 | Excel | `xlsx` → DuckDB | Build — convert then query |

### Summary

| Category | Total | From Evidence | Build |
|----------|:-----:|:---:|:---:|
| Databases | 16 | 13 | 3 thin cloud variants |
| Object Storage | 5 | 0 | 5 (2 are S3 variants) |
| Data Lakes | 2 | 0 | 2 (DuckDB extensions) |
| Flat Files | 4 | 1 (CSV) | 3 thin DuckDB wrappers |
| **Total** | **27** | **14** | **13** |

Plus shared library: `@evidence-dev/db-commons` (~500 lines) providing `EvidenceType`, `TypeFidelity`, `cleanQuery`, `exhaustStream`, `asyncIterableToBatchedAsyncGenerator`, `inferColumnTypes`.

---

## The Evidence Connector Contract

Every Evidence connector exports the same interface:

```javascript
// 1. Declarative config schema — drives UI form generation
module.exports.options = {
  host: { title: 'Host', type: 'string', required: true, default: 'localhost' },
  // type: 'string' | 'number' | 'boolean' | 'select' | 'file' | 'multiline'
  // secret: true hides the value
  // nest: true + children: { [value]: { ...childFields } } = conditional fields
};

// 2. Test connection — returns true or { reason: string }
module.exports.testConnection = async (opts) => { ... };

// 3. Query runner factory — returns function that runs SQL
module.exports.getRunner = (opts) => {
  return async (queryContent, queryPath, batchSize) => {
    return { rows: asyncGenerator | array, columnTypes: [...], expectedRowCount: number };
  };
};
```

Column types: `'boolean' | 'number' | 'string' | 'date' | 'bigint'` with fidelity `'precise' | 'inferred'`.

New connectors we build must follow this same contract.

---

## Task 1: Initialize connector service + install db-commons

**Files:**
- Create: `services/connector-service/package.json`
- Create: `services/connector-service/src/index.js`
- Create: `services/connector-service/src/connectors/index.js`
- Create: `services/connector-service/src/routes/connectors.js`
- Create: `services/connector-service/src/routes/query.js`
- Create: `services/connector-service/.env.example`

**Step 1: Create project structure**

```bash
mkdir -p services/connector-service/src/connectors services/connector-service/src/routes
```

**Step 2: Create package.json**

```json
{
  "name": "connector-service",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js",
    "test": "node --test src/**/*.test.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "cors": "^2.8.5",
    "@evidence-dev/db-commons": "^1.1.1"
  }
}
```

**Step 3: Install**

```bash
cd services/connector-service && npm install
```

**Step 4: Create the server** — `services/connector-service/src/index.js`:

```javascript
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/connectors', require('./routes/connectors'));
app.use('/api/query', require('./routes/query'));

const PORT = process.env.PORT || 3100;
app.listen(PORT, () => console.log(`connector-service :${PORT}`));
```

**Step 5: Create connector registry** — `services/connector-service/src/connectors/index.js`:

```javascript
const registry = new Map();

function register(type, aliases, mod) {
  registry.set(type, mod);
  for (const a of aliases) registry.set(a, mod);
}

function get(type) {
  return registry.get(type?.toLowerCase()) ?? null;
}

function list() {
  const seen = new Set();
  const out = [];
  for (const [type, mod] of registry) {
    if (seen.has(mod)) continue;
    seen.add(mod);
    out.push({ type, options: mod.options ?? {} });
  }
  return out;
}

module.exports = { register, get, list };
```

**Step 6: Create connectors route** — `services/connector-service/src/routes/connectors.js`:

```javascript
const { Router } = require('express');
const { get, list } = require('../connectors');

const router = Router();

router.get('/types', (_req, res) => res.json(list()));

router.get('/types/:type/options', (req, res) => {
  const c = get(req.params.type);
  if (!c) return res.status(404).json({ error: `Unknown connector: ${req.params.type}` });
  res.json(c.options ?? {});
});

router.post('/test', async (req, res) => {
  const { type, config } = req.body;
  const c = get(type);
  if (!c) return res.status(404).json({ error: `Unknown connector: ${type}` });
  try {
    const result = await c.testConnection(config);
    res.json(result === true ? { success: true } : { success: false, reason: result.reason });
  } catch (e) {
    res.status(500).json({ success: false, reason: e.message });
  }
});

module.exports = router;
```

**Step 7: Create query route** — `services/connector-service/src/routes/query.js`:

```javascript
const { Router } = require('express');
const { get } = require('../connectors');

const router = Router();

router.post('/execute', async (req, res) => {
  const { type, config, query, batchSize = 10000 } = req.body;
  const c = get(type);
  if (!c) return res.status(404).json({ error: `Unknown connector: ${type}` });
  try {
    const runner = await c.getRunner(config);
    const result = await runner(query, 'query.sql', batchSize);
    if (!result) return res.json({ rows: [], columnTypes: [] });

    let rows = result.rows;
    if (rows?.[Symbol.asyncIterator]) {
      const all = [];
      for await (const batch of rows) all.push(...batch);
      rows = all;
    }
    res.json({ rows, columnTypes: result.columnTypes, rowCount: result.expectedRowCount ?? rows.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
```

**Step 8: Create .env.example**

```
PORT=3100
```

**Step 9: Verify**

```bash
cd services/connector-service && node src/index.js &
curl http://localhost:3100/health
# Expected: {"status":"ok"}
curl http://localhost:3100/api/connectors/types
# Expected: [] (empty — no connectors registered yet)
kill %1
```

**Commit:** `"feat: scaffold connector service with Express + db-commons"`

---

## Task 2: Add Postgres connector

**Step 1:** `npm install pg pg-cursor`

**Step 2:** Copy the entire contents of `https://github.com/evidence-dev/evidence/blob/main/packages/datasources/postgres/index.cjs` to `services/connector-service/src/connectors/postgres.js`. Do not modify connector logic.

**Step 3:** Register in `src/connectors/index.js`:
```javascript
register('postgres', ['postgresql', 'pg', 'pgsql', 'supabase', 'rds-postgres', 'azure-postgres', 'neon'], require('./postgres'));
```

**Step 4: Verify**

```bash
cd services/connector-service && node -e "
const c = require('./src/connectors');
const pg = c.get('postgres');
console.log('options:', Object.keys(pg.options));
console.log('testConnection:', typeof pg.testConnection);
console.log('getRunner:', typeof pg.getRunner);
"
```

**Step 5: Live test** — Start service and test against Supabase using credentials from environment variables (`$SUPABASE_HOST`, `$SUPABASE_USER`, `$SUPABASE_PASSWORD`).

**Commit:** `"feat: add Postgres connector (from Evidence, MIT)"`

---

## Task 3: Add MySQL connector

**Step 1:** `npm install mysql2`

**Step 2:** Copy `packages/datasources/mysql/index.cjs` → `src/connectors/mysql.js`

**Step 3:** Register:
```javascript
register('mysql', ['mariadb'], require('./mysql'));
```

**Step 4:** Verify options keys: `host, port, database, user, password, ssl, socketPath`

**Commit:** `"feat: add MySQL connector (from Evidence, MIT)"`

---

## Task 4: Add BigQuery connector

**Step 1:** `npm install @google-cloud/bigquery google-auth-library`

**Step 2:** Copy `packages/datasources/bigquery/index.cjs` → `src/connectors/bigquery.js`

**Step 3:** Register:
```javascript
register('bigquery', ['bq', 'google-bigquery'], require('./bigquery'));
```

**Step 4:** Verify options include `project_id, location, authenticator` with nested children for service-account, gcloud-cli, oauth

**Commit:** `"feat: add BigQuery connector (from Evidence, MIT)"`

---

## Task 5: Add Snowflake connector

**Step 1:** `npm install snowflake-sdk`

**Step 2:** Copy `packages/datasources/snowflake/index.cjs` → `src/connectors/snowflake.js`

**Step 3:** Register:
```javascript
register('snowflake', ['sf'], require('./snowflake'));
```

**Commit:** `"feat: add Snowflake connector (from Evidence, MIT)"`

---

## Task 6: Add MSSQL connector

**Step 1:** `npm install mssql`

**Step 2:** Copy `packages/datasources/mssql/index.cjs` → `src/connectors/mssql.js`

**Step 3:** Register:
```javascript
register('mssql', ['sqlserver', 'azure-sql'], require('./mssql'));
```

**Commit:** `"feat: add MSSQL connector (from Evidence, MIT)"`

---

## Task 7: Add DuckDB + SQLite connectors

**Step 1:** Install correct packages:
```bash
npm install @duckdb/node-api sqlite3@5.1.6 sqlite@4.2.1
```

> **Warning:** The DuckDB package is `@duckdb/node-api`, NOT `duckdb`. The SQLite packages are `sqlite3` + `sqlite`, NOT `better-sqlite3`. Using the wrong packages will cause require() failures.

**Step 2:** Copy `packages/datasources/duckdb/index.cjs` → `src/connectors/duckdb.js`

**Step 3:** Copy `packages/datasources/sqlite/index.cjs` → `src/connectors/sqlite.js`

**Step 4:** Register:
```javascript
register('duckdb', ['duck'], require('./duckdb'));
register('sqlite', ['sqlite3'], require('./sqlite'));
```

**Step 5:** Test DuckDB in-memory:
```bash
curl -X POST http://localhost:3100/api/query/execute \
  -H 'Content-Type: application/json' \
  -d '{"type":"duckdb","config":{"filename":":memory:"},"query":"SELECT 42 as answer"}'
```

**Commit:** `"feat: add DuckDB + SQLite connectors (from Evidence, MIT)"`

---

## Task 8: Add derived connectors (Redshift, MotherDuck, CSV)

These reuse other connectors. **MotherDuck and CSV require import modifications.**

**Step 1:** Create `src/connectors/redshift.js`:
```javascript
module.exports = require('./postgres');
```

**Step 2:** Copy `packages/datasources/motherduck/index.cjs` → `src/connectors/motherduck.js`. Then change:
```javascript
// FROM:
require('@evidence-dev/duckdb')
// TO:
require('./duckdb')
```

**Step 3:** Copy `packages/datasources/csv/index.cjs` → `src/connectors/csv.js`. Apply the same import fix:
```javascript
// FROM:
require('@evidence-dev/duckdb')
// TO:
require('./duckdb')
```

**Step 4:** Register:
```javascript
register('redshift', ['aws-redshift'], require('./redshift'));
register('motherduck', ['md'], require('./motherduck'));
register('csv', [], require('./csv'));
```

**Commit:** `"feat: add Redshift, MotherDuck, CSV connectors"`

---

## Task 9: Add Databricks + Trino connectors

**Step 1:** Install correct packages:
```bash
npm install @databricks/sql presto-client
```

> **Warning:** The Trino connector uses `presto-client`, NOT `trino-client`. Evidence uses the Presto protocol client for Trino.

**Step 2:** Copy `packages/datasources/databricks/index.cjs` → `src/connectors/databricks.js`

**Step 3:** Copy `packages/datasources/trino/index.cjs` → `src/connectors/trino.js`

**Step 4:** Register:
```javascript
register('databricks', [], require('./databricks'));
register('trino', ['presto', 'starburst'], require('./trino'));
```

**Commit:** `"feat: add Databricks + Trino connectors (from Evidence, MIT)"`

---

## Task 10: Add community connector — Athena

**Step 1:** `npm install evidence-connector-aws-athena`

> License: ISC (permissive, compatible with MIT)

**Step 2:** Create `src/connectors/athena.js`:
```javascript
module.exports = require('evidence-connector-aws-athena');
```

**Step 3:** Register:
```javascript
register('athena', ['aws-athena'], require('./athena'));
```

**Commit:** `"feat: add Athena connector (community, ISC)"`

---

## Task 11: Build cloud database variants

These are thin wrappers: same base connector + extended auth options in the `options` schema.

**Step 1:** Create `src/connectors/azure-sql.js` — copy MSSQL connector, add Azure AD auth option:
```javascript
// Extend options with:
authenticator: {
  title: 'Authentication', type: 'select', default: 'sql',
  options: ['sql', 'azure-ad'],
  nest: true,
  children: {
    'azure-ad': {
      tenant_id: { title: 'Tenant ID', type: 'string', required: true },
      client_id: { title: 'Client ID', type: 'string', required: true }
    }
  }
}
```

**Step 2:** Create `src/connectors/rds-postgres.js` — copy Postgres connector, add IAM auth option:
```javascript
// Extend options with:
authenticator: {
  title: 'Authentication', type: 'select', default: 'password',
  options: ['password', 'iam'],
  nest: true,
  children: {
    'iam': {
      region: { title: 'AWS Region', type: 'string', required: true },
      access_key_id: { title: 'Access Key ID', type: 'string', secret: true },
      secret_access_key: { title: 'Secret Access Key', type: 'string', secret: true }
    }
  }
}
```

**Step 3:** Create `src/connectors/azure-postgres.js` — copy Postgres, add Azure AD auth option (same pattern as azure-sql).

**Step 4:** Register:
```javascript
register('azure-sql', ['azure-sql-database'], require('./azure-sql'));
register('rds-postgres', ['rds-postgresql', 'aws-postgres'], require('./rds-postgres'));
register('azure-postgres', ['azure-postgresql'], require('./azure-postgres'));
```

**Commit:** `"feat: add cloud database variants (Azure SQL, RDS Postgres, Azure Postgres)"`

---

## Task 12: Build Object Storage connectors (S3, GCS, Azure Blob, R2, B2)

All object storage connectors follow the same pattern: authenticate to bucket → use DuckDB httpfs extension to query Parquet/CSV files in-place. No data movement.

**Step 1:** `npm install @aws-sdk/client-s3 @google-cloud/storage @azure/storage-blob`

**Step 2:** Create `src/connectors/s3.js`:

```javascript
const { EvidenceType, TypeFidelity } = require('@evidence-dev/db-commons');

module.exports.options = {
  access_key_id:     { title: 'Access Key ID',     type: 'string', secret: true, required: true },
  secret_access_key: { title: 'Secret Access Key', type: 'string', secret: true, required: true },
  region:            { title: 'Region',             type: 'string', required: true, default: 'us-east-1' },
  bucket:            { title: 'Bucket',             type: 'string', required: true },
  prefix:            { title: 'Path Prefix',        type: 'string', default: '' },
  endpoint:          { title: 'Custom Endpoint',    type: 'string', description: 'For S3-compatible stores (R2, B2, MinIO)' }
};
```

Pattern for `getRunner`: use DuckDB with httpfs:
```sql
SET s3_region='...'; SET s3_access_key_id='...'; SET s3_secret_access_key='...';
-- If custom endpoint: SET s3_endpoint='...'; SET s3_url_style='path';
SELECT * FROM read_parquet('s3://bucket/prefix/**/*.parquet');
```

`testConnection`: list bucket contents to verify credentials.

**Step 3:** Create `src/connectors/gcs.js` — same pattern, DuckDB httpfs supports GCS via `gcs://` prefix. Config: `project_id, credentials_json (file), bucket, prefix`.

**Step 4:** Create `src/connectors/azure-blob.js` — same pattern, DuckDB httpfs supports Azure via `azure://` prefix. Config: `account_name, account_key, container, prefix`.

**Step 5:** Create `src/connectors/cloudflare-r2.js` — S3-compatible, thin wrapper:
```javascript
const s3 = require('./s3');
module.exports.options = {
  ...s3.options,
  account_id:  { title: 'Account ID', type: 'string', required: true },
  // endpoint auto-derived: https://<account_id>.r2.cloudflarestorage.com
};
// Delegate testConnection and getRunner to s3 with computed endpoint
```

**Step 6:** Create `src/connectors/backblaze-b2.js` — S3-compatible, same thin wrapper pattern with endpoint `s3.<region>.backblazeb2.com`.

**Step 7:** Register:
```javascript
register('s3', ['aws-s3', 'amazon-s3'], require('./s3'));
register('gcs', ['google-cloud-storage'], require('./gcs'));
register('azure-blob', ['azure-blob-storage', 'azure-storage'], require('./azure-blob'));
register('cloudflare-r2', ['r2'], require('./cloudflare-r2'));
register('backblaze-b2', ['b2'], require('./backblaze-b2'));
```

**Commit:** `"feat: add object storage connectors (S3, GCS, Azure Blob, R2, B2)"`

---

## Task 13: Build Data Lake connectors (Iceberg, Delta Lake)

Both use DuckDB extensions to scan table formats stored in object storage.

**Step 1:** Create `src/connectors/iceberg.js`:
- Options: storage credentials (S3/GCS/Azure) + `catalog_uri` (REST catalog URL)
- getRunner: `INSTALL iceberg; LOAD iceberg; SELECT * FROM iceberg_scan('s3://bucket/warehouse/table');`
- testConnection: attempt to load the extension and list tables

**Step 2:** Create `src/connectors/delta-lake.js`:
- Options: storage credentials + `table_path`
- getRunner: `INSTALL delta; LOAD delta; SELECT * FROM delta_scan('s3://bucket/delta-table/');`

**Step 3:** Register:
```javascript
register('iceberg', ['apache-iceberg'], require('./iceberg'));
register('delta-lake', ['delta', 'delta-table'], require('./delta-lake'));
```

**Commit:** `"feat: add data lake connectors (Iceberg, Delta Lake)"`

---

## Task 14: Build Flat File connectors (Parquet, JSON, Excel)

CSV is already handled by Evidence's CSV connector (Task 8). These three use the same DuckDB pattern for additional file formats.

**Step 1:** Create `src/connectors/parquet.js`:
```javascript
// options: { filepath: { title: 'File Path', type: 'file', required: true } }
// getRunner: read_parquet(filepath)
```

**Step 2:** Create `src/connectors/json.js`:
```javascript
// options: { filepath: { title: 'File Path', type: 'file', required: true }, format: { title: 'Format', type: 'select', options: ['json', 'jsonl'], default: 'auto' } }
// getRunner: read_json(filepath)
```

**Step 3:** Create `src/connectors/excel.js`:
- `npm install xlsx` (if DuckDB's spatial extension `ST_Read` isn't sufficient)
- Convert xlsx → CSV in memory → DuckDB `read_csv()`

**Step 4:** Register:
```javascript
register('parquet', [], require('./parquet'));
register('json', ['jsonl'], require('./json'));
register('excel', ['xlsx', 'xls'], require('./excel'));
```

**Commit:** `"feat: add flat file connectors (Parquet, JSON, Excel)"`

---

## Task 15: Platform-API bridge

**Files:**
- Create: `services/platform-api/app/infra/connector_client.py`
- Modify: `services/platform-api/app/api/routes/connections.py` (extend, not replace)

**Step 1:** Create HTTP client — `services/platform-api/app/infra/connector_client.py`:

```python
import httpx
import os

CONNECTOR_SERVICE_URL = os.getenv("CONNECTOR_SERVICE_URL", "http://localhost:3100")

async def list_connector_types() -> list[dict]:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{CONNECTOR_SERVICE_URL}/api/connectors/types")
        resp.raise_for_status()
        return resp.json()

async def get_connector_options(connector_type: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{CONNECTOR_SERVICE_URL}/api/connectors/types/{connector_type}/options")
        resp.raise_for_status()
        return resp.json()

async def test_connector(connector_type: str, config: dict) -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{CONNECTOR_SERVICE_URL}/api/connectors/test",
            json={"type": connector_type, "config": config},
        )
        resp.raise_for_status()
        return resp.json()

async def execute_connector_query(connector_type: str, config: dict, query: str, batch_size: int = 10000) -> dict:
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            f"{CONNECTOR_SERVICE_URL}/api/query/execute",
            json={"type": connector_type, "config": config, "query": query, "batchSize": batch_size},
        )
        resp.raise_for_status()
        return resp.json()
```

**Step 2:** Add proxy endpoints to existing `connections.py` route:
- `GET /connector-types` → list available types
- `GET /connector-types/:type/options` → config schema
- `POST /connector-test` → test connection (auth required)
- `POST /connector-query` → execute query (auth required)

**Step 3:** Add `CONNECTOR_SERVICE_URL=http://localhost:3100` to platform-api env.

**Commit:** `"feat: platform-api bridge to connector service"`

---

## Task 16: Full smoke test

Start the service and verify all connector types are registered:

```bash
cd services/connector-service && node src/index.js &
curl -s http://localhost:3100/api/connectors/types | node -e "
  process.stdin.on('data', d => {
    const types = JSON.parse(d);
    console.log(types.length + ' connectors registered:');
    types.forEach(t => console.log('  ' + t.type));
  });
"
```

Expected: 27 connectors across 4 categories.

**Database tests:**
- Postgres: test against Supabase (use env vars for credentials)
- DuckDB: in-memory `SELECT 42 as answer`
- SQLite: in-memory query

**Object storage tests:**
- S3: test connection with valid AWS credentials
- R2/B2: verify options schema inherits from S3

**Flat file tests:**
- CSV: query a local CSV file
- Parquet: query a local Parquet file

**End-to-end via platform-api:**
```bash
curl http://localhost:8000/connections/connector-types
# Should return all 27 connector types
```

**Commit:** `"feat: complete connector service — 27 connectors across 4 categories"`

---

## Task 17: Dockerize

Create `services/connector-service/Dockerfile`:
```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY src/ ./src/
EXPOSE 3100
CMD ["node", "src/index.js"]
```

Create `services/connector-service/.dockerignore`:
```
node_modules
.env
*.test.js
```

Build and test:
```bash
docker build -t connector-service .
docker run -p 3100:3100 connector-service
curl http://localhost:3100/health
```

**Commit:** `"chore: add Dockerfile for connector service"`

---

## Final State

```
services/connector-service/
├── Dockerfile
├── .dockerignore
├── .env.example
├── package.json
└── src/
    ├── index.js                    # Express server
    ├── connectors/
    │   ├── index.js                # Registry (register/get/list)
    │   │
    │   │── # Databases (Evidence OSS, as-is)
    │   ├── postgres.js
    │   ├── mysql.js
    │   ├── bigquery.js
    │   ├── snowflake.js
    │   ├── mssql.js
    │   ├── duckdb.js
    │   ├── sqlite.js
    │   ├── databricks.js
    │   ├── trino.js
    │   ├── redshift.js             # 1 line — re-exports postgres
    │   ├── motherduck.js           # Modified import: ./duckdb not @evidence-dev/duckdb
    │   ├── csv.js                  # Modified import: ./duckdb not @evidence-dev/duckdb
    │   ├── athena.js               # 1 line — re-exports community npm pkg
    │   │
    │   │── # Cloud DB variants (built, thin wrappers)
    │   ├── azure-sql.js
    │   ├── rds-postgres.js
    │   ├── azure-postgres.js
    │   │
    │   │── # Object Storage (built, DuckDB httpfs)
    │   ├── s3.js
    │   ├── gcs.js
    │   ├── azure-blob.js
    │   ├── cloudflare-r2.js        # Thin S3 variant
    │   ├── backblaze-b2.js         # Thin S3 variant
    │   │
    │   │── # Data Lakes (built, DuckDB extensions)
    │   ├── iceberg.js
    │   ├── delta-lake.js
    │   │
    │   │── # Flat Files (built, DuckDB read_*)
    │   ├── parquet.js
    │   ├── json.js
    │   └── excel.js
    │
    └── routes/
        ├── connectors.js           # GET /types, GET /types/:type/options, POST /test
        └── query.js                # POST /execute

services/platform-api/
├── app/infra/connector_client.py   # HTTP bridge to connector service
└── app/api/routes/connections.py   # Extended with proxy endpoints
```

**Endpoints:**
- `GET /health`
- `GET /api/connectors/types` — list all registered connectors with options schemas
- `GET /api/connectors/types/:type/options` — config schema for one connector
- `POST /api/connectors/test` — test a connection `{ type, config }`
- `POST /api/query/execute` — run a query `{ type, config, query, batchSize }`

**Not in this plan:**
- Application connectors (Linear, Stripe, HubSpot, etc. — use Kestra integration stubs)
- Frontend connector page UI
- Admin shell
- SQL console frontend