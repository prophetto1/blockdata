# Connector Service: Full Integration Surface

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Stand up a Node.js connector microservice covering the full integration surface — databases, object storage, data lakes, and file uploads — modeled after Evidence Studio's connector architecture. Bridge it to platform-api so the frontend can test connections, introspect schemas, and execute queries.

**Architecture:** Standalone Node/Express service (`services/connector-service/`) that wraps Evidence's single-file connector packages behind a REST API. Platform-api (Python/FastAPI) proxies requests to it. Frontend calls platform-api as usual — never talks to the connector service directly.

**Tech Stack:** Node.js 20+, Express, Evidence datasource packages (CommonJS), `@evidence-dev/db-commons` (shared utilities), AWS/GCP/Azure SDKs for object storage. Platform-api bridge via `httpx`.

---

## Background (for new team members)

### Why a separate Node service?

The platform needs to connect to external databases (Postgres, BigQuery, Snowflake, etc.) for live querying, schema browsing, and eventually a visual query builder. We evaluated several open-source projects for connector patterns:

- **Evidence** (MIT) — clean, single-file connector architecture. Each database adapter is ~100-300 lines implementing three exports: `options` (config schema), `testConnection()`, and `getRunner()` (query execution). 14 connectors already written and tested. **This is what we're migrating.**
- **Metabase** (AGPL) — best architecture but copyleft, can't take code. Studied for reference only.
- **Apache Superset** (Apache 2.0) — SQLAlchemy-based, Python. Alternative if we ever need Python connectors.

We chose JavaScript because Evidence's connectors are already JS, the npm database clients are mature, and rewriting 14 adapters in Python would be wasted effort.

### Evidence Connector Contract

Every Evidence connector exports three things:

```javascript
// 1. Declarative config schema — drives UI form generation
module.exports.options = {
  host:     { title: 'Host',     type: 'string',  required: true, default: 'localhost' },
  port:     { title: 'Port',     type: 'number',  required: true, default: 5432 },
  database: { title: 'Database', type: 'string',  required: true },
  user:     { title: 'Username', type: 'string',  required: true },
  password: { title: 'Password', type: 'string',  secret: true, required: true },
  ssl: {
    title: 'Enable SSL', type: 'boolean', default: false,
    nest: true,                          // conditional children
    children: {
      true: {
        rejectUnauthorized: { title: 'Reject Unauthorized', type: 'boolean', default: true }
      }
    }
  }
};

// 2. Test connection
module.exports.testConnection = async (opts) => {
  return await runQuery('SELECT 1;', opts)
    .then(exhaustStream)
    .then(() => true)
    .catch((e) => ({ reason: e.message }));
};

// 3. Query runner factory
module.exports.getRunner = (opts) => {
  return async (queryContent, queryPath, batchSize) => {
    if (!queryPath.endsWith('.sql')) return null;
    return await runQuery(queryContent, opts, batchSize);
  };
};
```

Results return as `{ rows, columnTypes, expectedRowCount }`. The type system has 4 types: `boolean`, `number`, `string`, `date`. Each connector maps its native DB types to these.

### Config Option Field Types

The `options` schema supports these field types (used to generate config forms):

| Property | Type | Purpose |
|----------|------|---------|
| `title` | string | UI label |
| `type` | `'string' \| 'number' \| 'boolean' \| 'select' \| 'file' \| 'multiline'` | Control type |
| `secret` | boolean | If true, not source-controlled |
| `required` | boolean | Validation |
| `default` | any | Default value |
| `description` | string | Help text |
| `options` | array | For `select` type — `string[]` or `{value, label}[]` |
| `nest` | boolean | If true, `children` are shown based on this field's value |
| `children` | `Record<string, OptionsSpec>` | Conditional sub-fields |

The `nest`/`children` pattern enables conditional config — SSL options appear only when SSL is toggled on, auth method fields change based on selected auth type.

### Shared Utilities (`@evidence-dev/db-commons`)

Evidence provides a shared library used by all connectors:

| Utility | Purpose |
|---------|---------|
| `EvidenceType` enum | `boolean`, `number`, `string`, `date` |
| `TypeFidelity` enum | `precise` (from DB metadata) or `inferred` (guessed from values) |
| `asyncIterableToBatchedAsyncGenerator()` | Converts any DB cursor/stream to batched results |
| `exhaustStream()` | Drains an async generator (used in `testConnection`) |
| `cleanQuery()` | Strips trailing semicolons |
| `inferColumnTypes()` | Guesses types from row values when DB metadata unavailable |

### Reference Materials

**Evidence open-source repos (MIT):**
- Main repo: https://github.com/evidence-dev/evidence
  - Connectors: `packages/datasources/` (14 packages)
  - Shared DB utils: `packages/lib/db-commons/`
  - Plugin SDK: `packages/lib/sdk/src/plugins/datasources/`
- Datasource template: https://github.com/evidence-dev/datasource-template

**Evidence Studio (design reference for connector page):**
- URL: https://evidence.studio
- Connector page screenshot: `docs/screenshot/image.png`
- Admin settings screenshots: `docs/screenshot/image copy.png`, `image copy 2.png`, `image copy 3.png`
- SQL Console screenshot: `docs/screenshot/image2.png`

**Our existing connections route:**
- `services/platform-api/app/api/routes/connections.py` — already handles generic connection CRUD with encrypted credential storage. The connector-service bridge extends this, not replaces it.

---

## Full Connector Surface

### Category 1: Files (upload, no connection needed)

| # | Connector | npm package | Source | Notes |
|---|-----------|-------------|--------|-------|
| 1 | CSV | (uses DuckDB) | Evidence OSS | Upload → query via DuckDB `read_csv()` |
| 2 | Parquet | (uses DuckDB) | Build (thin) | Upload → query via DuckDB `read_parquet()` |
| 3 | JSON / JSONL | (uses DuckDB) | Build (thin) | Upload → query via DuckDB `read_json()` |
| 4 | Excel | `xlsx` or DuckDB | Build (thin) | Upload → convert → query |

### Category 2: Databases (connect + query)

| # | Connector | npm package | Source | Notes |
|---|-----------|-------------|--------|-------|
| 5 | PostgreSQL | `pg`, `pg-cursor` | Evidence OSS | Base SQL connector |
| 6 | MySQL | `mysql2` | Evidence OSS | |
| 7 | BigQuery | `@google-cloud/bigquery` | Evidence OSS | 3 auth methods (service account, gcloud CLI, OAuth) |
| 8 | Snowflake | `snowflake-sdk` | Evidence OSS | 4 auth methods |
| 9 | MS SQL Server | `mssql` | Evidence OSS | |
| 10 | SQLite | `better-sqlite3` | Evidence OSS | |
| 11 | DuckDB | `duckdb` | Evidence OSS | Also used internally by file connectors |
| 12 | Redshift | `pg` (Postgres driver) | Evidence OSS | Thin wrapper over Postgres |
| 13 | Databricks | `@databricks/sql` | Evidence OSS | |
| 14 | Trino | `trino-client` | Evidence OSS | |
| 15 | MotherDuck | `@motherduck/node-connector` | Evidence OSS | Cloud DuckDB |
| 16 | Athena | `@aws-sdk/client-athena` | Build | AWS query engine over S3. Kestra has `plugin-aws` with Athena task. |
| 17 | Azure SQL Database | `mssql` | Build (thin) | MSSQL connector + Azure AD auth options |
| 18 | Azure Postgres | `pg` | Build (thin) | Postgres connector + Azure AD auth options |
| 19 | RDS PostgreSQL | `pg` | Build (thin) | Postgres connector + IAM auth option |
| 20 | Google Cloud PostgreSQL | `pg` | Build (thin) | Postgres connector + GCP IAM auth option |

**Cloud variants (17-20)** are thin wrappers: same base connector (pg or mssql) with additional auth options in the `options` schema. Minimal code.

### Category 3: Object Storage (connect, query Parquet/CSV in-place)

| # | Connector | npm package | Source | Notes |
|---|-----------|-------------|--------|-------|
| 21 | AWS S3 | `@aws-sdk/client-s3` | Build | Query Parquet/CSV in bucket via DuckDB `read_parquet('s3://...')`. Kestra has `plugin-aws` S3 tasks. |
| 22 | Google Cloud Storage | `@google-cloud/storage` | Build | Same pattern — DuckDB reads GCS via `httpfs`. Kestra has GCS tasks. |
| 23 | Azure Blob Storage | `@azure/storage-blob` | Build | DuckDB reads Azure via `httpfs`. Kestra has Azure Blob tasks. |
| 24 | Cloudflare R2 | `@aws-sdk/client-s3` | Build (thin) | S3-compatible API — reuse S3 connector with custom endpoint |
| 25 | Backblaze B2 | `@aws-sdk/client-s3` | Build (thin) | S3-compatible API — reuse S3 connector with custom endpoint |

**Object storage pattern:** Authenticate to bucket → use DuckDB's `httpfs` extension to query Parquet/CSV files in-place. No data movement. S3-compatible stores (R2, B2) are trivial variants of the S3 connector with a different endpoint URL.

### Category 4: Data Lakes (connect, query via catalog)

| # | Connector | npm package | Source | Notes |
|---|-----------|-------------|--------|-------|
| 26 | Apache Iceberg | `@apache/iceberg` or REST catalog client | Build | Read Iceberg catalog → query data files via DuckDB `iceberg_scan()`. |
| 27 | Delta Lake | `delta-rs` (via DuckDB) | Build | Query Delta tables via DuckDB `delta_scan()`. |

**Data lake pattern:** Connect to catalog (Iceberg REST, Hive Metastore, or Glue) or point at storage path → DuckDB scans the table format directly.

### Category 5: Utility Connectors (dev/test)

| # | Connector | npm package | Source | Notes |
|---|-----------|-------------|--------|-------|
| 28 | Faker | `@faker-js/faker` | Evidence OSS | Generate test data |
| 29 | JavaScript | (built-in) | Evidence OSS | Custom JS data source |

### Summary

| Category | Count | From Evidence OSS | Build ourselves | Kestra overlap |
|----------|-------|:-:|:-:|:-:|
| Files | 4 | 1 (CSV) | 3 (thin, all use DuckDB) | — |
| Databases | 16 | 11 | 5 (4 are thin cloud variants) | JDBC, MongoDB, etc. |
| Object Storage | 5 | 0 | 5 (2 are S3-compatible variants) | S3, GCS, Azure Blob |
| Data Lakes | 2 | 0 | 2 (DuckDB extensions) | — |
| Utility | 2 | 2 | 0 | — |
| **Total** | **29** | **14** | **15** | Multiple overlaps |

Of the 15 we build ourselves: 4 are trivial cloud DB variants (same driver, different auth), 2 are S3-compatible variants (same code, different endpoint), and the remaining 9 are moderate-effort builds using existing npm SDKs + DuckDB's extension ecosystem.

---

## Task 1: Scaffold the Connector Service

**Files:**
- Create: `services/connector-service/package.json`
- Create: `services/connector-service/src/index.js`
- Create: `services/connector-service/src/routes/connections.js`
- Create: `services/connector-service/src/routes/query.js`
- Create: `services/connector-service/src/connectors/index.js`
- Create: `services/connector-service/.env.example`

**Step 1: Initialize the Node project**

```bash
cd services
mkdir -p connector-service/src/routes connector-service/src/connectors
cd connector-service
npm init -y
npm install express cors helmet dotenv
npm install -D nodemon jest
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

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/connections', require('./routes/connections'));
app.use('/api/query', require('./routes/query'));

const PORT = process.env.PORT || 3100;
app.listen(PORT, () => console.log(`Connector service listening on :${PORT}`));
```

**Step 3: Create the connections route**

`services/connector-service/src/routes/connections.js`:
```javascript
const express = require('express');
const router = express.Router();
const { getConnector, listConnectors } = require('../connectors');

// List available connector types with their config schemas
router.get('/types', (req, res) => {
  res.json(listConnectors());
});

// Get config schema for a specific connector type
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
    res.json(result === true ? { success: true } : { success: false, reason: result.reason });
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

// Execute a query
router.post('/execute', async (req, res) => {
  const { type, config, query, batchSize = 10000 } = req.body;
  const connector = getConnector(type);
  if (!connector) return res.status(404).json({ error: 'Unknown connector type' });
  try {
    const runner = connector.getRunner(config);
    const result = await runner(query, 'query.sql', batchSize);
    if (!result) return res.json({ rows: [], columnTypes: [] });

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

**Step 6: Create .env.example**

`services/connector-service/.env.example`:
```
PORT=3100
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

**Step 7: Add scripts to package.json**

Ensure `package.json` has:
```json
{
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js",
    "test": "jest"
  }
}
```

**Step 8: Verify the service starts**

```bash
npm run dev
# Expected: "Connector service listening on :3100"
# Test: curl http://localhost:3100/health → {"status":"ok"}
# Test: curl http://localhost:3100/api/connections/types → [] (empty, no connectors registered yet)
```

**Step 9: Commit**
```bash
git add services/connector-service/
git commit -m "feat: scaffold connector service (Node/Express)"
```

---

## Task 2: Install Evidence Shared Utilities

**Files:**
- Modify: `services/connector-service/package.json`

**Step 1: Install db-commons**

```bash
cd services/connector-service
npm install @evidence-dev/db-commons
```

**Step 2: Verify it exports what we need**

Create a quick check (delete after):
```bash
node -e "const db = require('@evidence-dev/db-commons'); console.log(Object.keys(db))"
```

Expected output should include: `EvidenceType`, `TypeFidelity`, `asyncIterableToBatchedAsyncGenerator`, `exhaustStream`, `cleanQuery`, `inferColumnTypes`.

**Step 3: Commit**
```bash
git commit -am "chore: add @evidence-dev/db-commons"
```

---

## Task 3: Migrate PostgreSQL Connector

**Files:**
- Create: `services/connector-service/src/connectors/postgres.js`
- Modify: `services/connector-service/src/connectors/index.js`
- Create: `services/connector-service/src/connectors/__tests__/postgres.test.js`

**Step 1: Install Postgres client libraries**

```bash
npm install pg pg-cursor
```

**Step 2: Copy and adapt the Evidence Postgres connector**

Download from: `https://raw.githubusercontent.com/evidence-dev/evidence/main/packages/datasources/postgres/index.cjs`

Save to: `services/connector-service/src/connectors/postgres.js`

Key things to keep as-is:
- `options` schema (host, port, database, user, password, ssl, connection_string)
- `testConnection()` implementation
- `getRunner()` factory
- `runQuery()` with `pg-cursor` for streaming
- `nativeTypeToEvidenceType()` type mapping
- `standardizeRow()` for key lowercasing and BigInt conversion

Key adaptation:
- Remove any Evidence-specific imports beyond `@evidence-dev/db-commons`
- Ensure the module exports `{ options, testConnection, getRunner }` at minimum

**Step 3: Register in connector index**

Add to `services/connector-service/src/connectors/index.js`:
```javascript
const postgres = require('./postgres');
register('postgres', ['postgresql', 'pg', 'pgsql', 'psql'], postgres);
```

**Step 4: Write tests**

`services/connector-service/src/connectors/__tests__/postgres.test.js`:
```javascript
const postgres = require('../postgres');

describe('Postgres connector', () => {
  test('exports options, testConnection, getRunner', () => {
    expect(postgres.options).toBeDefined();
    expect(typeof postgres.options).toBe('object');
    expect(typeof postgres.testConnection).toBe('function');
    expect(typeof postgres.getRunner).toBe('function');
  });

  test('options has required connection fields', () => {
    const opts = postgres.options;
    expect(opts.host).toBeDefined();
    expect(opts.port).toBeDefined();
    expect(opts.database).toBeDefined();
    expect(opts.user).toBeDefined();
    expect(opts.password).toBeDefined();
    expect(opts.password.secret).toBe(true);
  });

  test('getRunner returns a function', () => {
    const runner = postgres.getRunner({ host: 'localhost' });
    expect(typeof runner).toBe('function');
  });

  test('runner skips non-SQL paths', async () => {
    const runner = postgres.getRunner({ host: 'localhost' });
    const result = await runner('content', 'file.txt', 100);
    expect(result).toBeNull();
  });
});
```

**Step 5: Run tests**
```bash
npx jest --testPathPattern=postgres --verbose
```
Expected: 4 tests pass.

**Step 6: Verify via HTTP (if you have a Postgres instance)**
```bash
curl -X POST http://localhost:3100/api/connections/test \
  -H "Content-Type: application/json" \
  -d '{"type":"postgres","config":{"host":"localhost","port":5432,"database":"postgres","user":"postgres","password":"postgres"}}'
# Expected: {"success":true} or {"success":false,"reason":"..."}
```

**Step 7: Commit**
```bash
git add services/connector-service/
git commit -m "feat: migrate Evidence Postgres connector"
```

---

## Task 4: Migrate MySQL Connector

Same pattern as Task 3.

**Step 1:** `npm install mysql2`

**Step 2:** Download `packages/datasources/mysql/index.cjs` → save as `services/connector-service/src/connectors/mysql.js`

**Step 3:** Register:
```javascript
const mysql = require('./mysql');
register('mysql', ['mysql2'], mysql);
```

**Step 4:** Write interface test (same pattern — exports check, options check, runner returns function, skips non-SQL).

**Step 5:** Run tests, commit:
```bash
git commit -am "feat: migrate Evidence MySQL connector"
```

---

## Task 5: Migrate BigQuery Connector

**Step 1:** `npm install @google-cloud/bigquery`

**Step 2:** Download `packages/datasources/bigquery/index.cjs` → `services/connector-service/src/connectors/bigquery.js`

**Note:** BigQuery has 3 auth methods in its options schema — `service-account` (JSON key file), `gcloud-cli`, and `oauth`. The `nest`/`children` pattern handles this. Keep it as-is.

**Step 3:** Register:
```javascript
const bigquery = require('./bigquery');
register('bigquery', ['bq'], bigquery);
```

**Step 4:** Write interface test, run tests, commit:
```bash
git commit -am "feat: migrate Evidence BigQuery connector"
```

---

## Task 6: Migrate Snowflake Connector

**Step 1:** `npm install snowflake-sdk`

**Step 2:** Download `packages/datasources/snowflake/index.cjs` → `services/connector-service/src/connectors/snowflake.js`

**Note:** Snowflake has 4 auth methods (password, key pair, external browser, Okta). Keep the nested options as-is.

**Step 3:** Register:
```javascript
const snowflake = require('./snowflake');
register('snowflake', [], snowflake);
```

**Step 4:** Write interface test, run tests, commit:
```bash
git commit -am "feat: migrate Evidence Snowflake connector"
```

---

## Task 7: Migrate MSSQL Connector

**Step 1:** `npm install mssql`

**Step 2:** Download → `services/connector-service/src/connectors/mssql.js`

**Step 3:** Register:
```javascript
const mssql = require('./mssql');
register('mssql', ['sqlserver', 'sql-server'], mssql);
```

**Step 4:** Test, commit:
```bash
git commit -am "feat: migrate Evidence MSSQL connector"
```

---

## Task 8: Migrate SQLite Connector

**Step 1:** `npm install better-sqlite3`

**Step 2:** Download → `services/connector-service/src/connectors/sqlite.js`

**Step 3:** Register:
```javascript
const sqlite = require('./sqlite');
register('sqlite', ['sqlite3'], sqlite);
```

**Step 4:** Test, commit:
```bash
git commit -am "feat: migrate Evidence SQLite connector"
```

---

## Task 9: Migrate DuckDB Connector

**Step 1:** `npm install duckdb`

**Step 2:** Download → `services/connector-service/src/connectors/duckdb.js`

**Step 3:** Register:
```javascript
const duckdb = require('./duckdb');
register('duckdb', [], duckdb);
```

**Step 4:** Test, commit:
```bash
git commit -am "feat: migrate Evidence DuckDB connector"
```

---

## Task 10: Migrate Remaining Connectors (Redshift, Databricks, Trino, CSV, MotherDuck)

These are lower priority. Migrate in one batch:

| Connector | npm install | Notes |
|-----------|-------------|-------|
| Redshift | (uses `pg`, already installed) | Thin wrapper over Postgres connector |
| Databricks | `@databricks/sql` | |
| Trino | `trino-client` | |
| CSV | (uses DuckDB, already installed) | Delegates to DuckDB with `read_csv()` |
| MotherDuck | `@motherduck/node-connector` | Cloud DuckDB |

For each: download source → save to `connectors/` → register with aliases → write interface test.

```bash
git commit -am "feat: migrate Redshift, Databricks, Trino, CSV, MotherDuck connectors"
```

---

## Task 11: Build Cloud Database Variants (Azure SQL, Azure Postgres, RDS Postgres, GCP Postgres)

These are thin wrappers over existing connectors with additional auth options.

**Files:**
- Create: `services/connector-service/src/connectors/azure-sql.js`
- Create: `services/connector-service/src/connectors/azure-postgres.js`
- Create: `services/connector-service/src/connectors/rds-postgres.js`
- Create: `services/connector-service/src/connectors/gcp-postgres.js`

**Pattern:** Copy the base connector (postgres.js or mssql.js), extend the `options` schema with cloud-specific auth fields:

For Azure variants — add Azure AD / Managed Identity auth:
```javascript
authenticator: {
  title: 'Authentication', type: 'select', default: 'password',
  options: ['password', 'azure-ad'],
  nest: true,
  children: {
    'password': { /* existing user/password fields */ },
    'azure-ad': {
      tenant_id: { title: 'Tenant ID', type: 'string', required: true },
      client_id: { title: 'Client ID', type: 'string', required: true }
    }
  }
}
```

For RDS Postgres — add IAM auth:
```javascript
authenticator: {
  title: 'Authentication', type: 'select', default: 'password',
  options: ['password', 'iam'],
  nest: true,
  children: {
    'password': { /* existing user/password fields */ },
    'iam': {
      region: { title: 'AWS Region', type: 'string', required: true },
      access_key_id: { title: 'Access Key ID', type: 'string', secret: true },
      secret_access_key: { title: 'Secret Access Key', type: 'string', secret: true }
    }
  }
}
```

Register all four:
```javascript
register('azure-sql', ['azure-sql-database'], azureSql);
register('azure-postgres', ['azure-postgresql'], azurePostgres);
register('rds-postgres', ['rds-postgresql', 'aws-postgres'], rdsPostgres);
register('gcp-postgres', ['cloud-sql-postgres', 'google-cloud-postgresql'], gcpPostgres);
```

```bash
git commit -am "feat: add cloud database variant connectors (Azure SQL, Azure Postgres, RDS, GCP)"
```

---

## Task 12: Build Athena Connector

**Files:**
- Create: `services/connector-service/src/connectors/athena.js`

**Step 1:** `npm install @aws-sdk/client-athena @aws-sdk/client-s3`

**Step 2:** Implement the Athena connector:
- `options`: region, access_key_id, secret_access_key, database, workgroup, s3_output_location
- `testConnection`: run `SELECT 1` via Athena `StartQueryExecution` + `GetQueryResults`
- `getRunner`: execute SQL → poll for completion → fetch results from S3
- Type mapping: Athena types → Evidence types

**Note:** Kestra has an Athena task in `plugin-aws` — reference `E:/KESTRA-IO/plugins/plugin-aws` for the query execution pattern.

```bash
git commit -am "feat: add Athena connector"
```

---

## Task 13: Build Object Storage Connectors (S3, GCS, Azure Blob, R2, B2)

**Files:**
- Create: `services/connector-service/src/connectors/s3.js`
- Create: `services/connector-service/src/connectors/gcs.js`
- Create: `services/connector-service/src/connectors/azure-blob.js`
- Create: `services/connector-service/src/connectors/cloudflare-r2.js`
- Create: `services/connector-service/src/connectors/backblaze-b2.js`

**Step 1:** `npm install @aws-sdk/client-s3 @google-cloud/storage @azure/storage-blob`

**Step 2:** The object storage pattern uses DuckDB's `httpfs` extension to query files in-place:

```javascript
// S3 connector — query Parquet/CSV directly in bucket
module.exports.options = {
  access_key_id:     { title: 'Access Key ID',     type: 'string', secret: true, required: true },
  secret_access_key: { title: 'Secret Access Key',  type: 'string', secret: true, required: true },
  region:            { title: 'Region',              type: 'string', required: true, default: 'us-east-1' },
  bucket:            { title: 'Bucket',              type: 'string', required: true },
  prefix:            { title: 'Path Prefix',         type: 'string', default: '' },
  endpoint:          { title: 'Custom Endpoint',     type: 'string', description: 'For S3-compatible stores (R2, B2, MinIO)' }
};
```

For `getRunner`, use DuckDB with httpfs:
```javascript
const duckdb = require('duckdb');
// SET s3_region, s3_access_key_id, s3_secret_access_key, s3_endpoint
// Then: SELECT * FROM read_parquet('s3://bucket/prefix/**/*.parquet')
```

**Cloudflare R2 and Backblaze B2** are trivial: copy S3 connector, set `endpoint` default to the provider's S3-compatible URL. Register with different aliases.

```javascript
register('s3', ['aws-s3', 'amazon-s3'], s3);
register('gcs', ['google-cloud-storage'], gcs);
register('azure-blob', ['azure-blob-storage', 'azure-storage'], azureBlob);
register('cloudflare-r2', ['r2'], cloudflareR2);
register('backblaze-b2', ['b2'], backblazeB2);
```

```bash
git commit -am "feat: add object storage connectors (S3, GCS, Azure Blob, R2, B2)"
```

---

## Task 14: Build Data Lake Connectors (Iceberg, Delta Lake)

**Files:**
- Create: `services/connector-service/src/connectors/iceberg.js`
- Create: `services/connector-service/src/connectors/delta-lake.js`

These use DuckDB extensions:

**Iceberg:**
```sql
INSTALL iceberg; LOAD iceberg;
SELECT * FROM iceberg_scan('s3://bucket/warehouse/table');
```

**Delta Lake:**
```sql
INSTALL delta; LOAD delta;
SELECT * FROM delta_scan('s3://bucket/delta-table/');
```

Both connectors need storage credentials (same as object storage) plus catalog configuration for Iceberg (REST catalog URL, Hive Metastore, or AWS Glue).

```javascript
register('iceberg', ['apache-iceberg'], iceberg);
register('delta-lake', ['delta', 'delta-table'], deltaLake);
```

```bash
git commit -am "feat: add data lake connectors (Iceberg, Delta Lake)"
```

---

## Task 15: Build File Upload Connectors (Parquet, JSON, Excel)

**Files:**
- Create: `services/connector-service/src/connectors/parquet.js`
- Create: `services/connector-service/src/connectors/json.js`
- Create: `services/connector-service/src/connectors/excel.js`

These are upload-then-query connectors. Pattern:
1. File is uploaded via platform-api (stored in platform storage)
2. Connector service receives a local file path or URL
3. DuckDB queries it: `read_parquet()`, `read_json()`, or via `xlsx` → CSV → DuckDB

```javascript
register('parquet', [], parquet);
register('json', ['jsonl'], json);
register('excel', ['xlsx', 'xls'], excel);
```

```bash
git commit -am "feat: add file upload connectors (Parquet, JSON, Excel)"
```

---

## Task 16: Platform-API Bridge

**Files:**
- Create: `services/platform-api/app/infra/connector_client.py`
- Modify: `services/platform-api/app/api/routes/connections.py` (ALREADY EXISTS — extend with connector-service proxy endpoints)

**Step 1: Create the HTTP client**

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
        resp = await client.get(
            f"{CONNECTOR_SERVICE_URL}/api/connections/types/{connector_type}/options"
        )
        resp.raise_for_status()
        return resp.json()


async def test_connector(connector_type: str, config: dict) -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{CONNECTOR_SERVICE_URL}/api/connections/test",
            json={"type": connector_type, "config": config},
        )
        resp.raise_for_status()
        return resp.json()


async def execute_connector_query(
    connector_type: str, config: dict, query: str, batch_size: int = 10000
) -> dict:
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            f"{CONNECTOR_SERVICE_URL}/api/query/execute",
            json={
                "type": connector_type,
                "config": config,
                "query": query,
                "batchSize": batch_size,
            },
        )
        resp.raise_for_status()
        return resp.json()
```

**Step 2: Add proxy endpoints to existing connections route**

Add these endpoints to `services/platform-api/app/api/routes/connections.py` (below existing routes):

```python
from app.infra.connector_client import (
    list_connector_types,
    get_connector_options,
    test_connector,
    execute_connector_query,
)


@router.get("/connector-types")
async def get_connector_types():
    """List available database connector types from the connector service."""
    return await list_connector_types()


@router.get("/connector-types/{connector_type}/options")
async def get_connector_type_options(connector_type: str):
    """Get the config schema for a connector type (drives UI form generation)."""
    return await get_connector_options(connector_type)


class ConnectorTestRequest(BaseModel):
    connector_type: str
    config: dict[str, Any]


@router.post("/connector-test")
async def test_connector_endpoint(
    req: ConnectorTestRequest, auth: AuthPrincipal = Depends(require_user_auth)
):
    """Test a database connection via the connector service."""
    return await test_connector(req.connector_type, req.config)


class ConnectorQueryRequest(BaseModel):
    connector_type: str
    config: dict[str, Any]
    query: str
    batch_size: int = 10000


@router.post("/connector-query")
async def execute_query_endpoint(
    req: ConnectorQueryRequest, auth: AuthPrincipal = Depends(require_user_auth)
):
    """Execute a SQL query via the connector service."""
    return await execute_connector_query(
        req.connector_type, req.config, req.query, req.batch_size
    )
```

**Step 3: Add CONNECTOR_SERVICE_URL to platform-api env**

Add to `services/platform-api/.env`:
```
CONNECTOR_SERVICE_URL=http://localhost:3100
```

**Step 4: Verify end-to-end**

Start both services:
```bash
# Terminal 1:
cd services/connector-service && npm run dev

# Terminal 2:
cd services/platform-api && uvicorn app.main:app --reload
```

Test:
```bash
# List connector types via platform-api
curl http://localhost:8000/connections/connector-types

# Get Postgres options
curl http://localhost:8000/connections/connector-types/postgres/options

# Test a connection (requires auth token in production)
curl -X POST http://localhost:8000/connections/connector-test \
  -H "Content-Type: application/json" \
  -d '{"connector_type":"postgres","config":{"host":"localhost","port":5432,"database":"test","user":"postgres","password":"postgres"}}'
```

**Step 5: Commit**
```bash
git add services/platform-api/app/infra/connector_client.py
git add services/platform-api/app/api/routes/connections.py
git commit -m "feat: platform-api bridge to connector service"
```

---

## Task 17: Dockerize Connector Service

**Files:**
- Create: `services/connector-service/Dockerfile`
- Create: `services/connector-service/.dockerignore`

**Step 1: Create Dockerfile**

`services/connector-service/Dockerfile`:
```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY src/ ./src/
EXPOSE 3100
CMD ["node", "src/index.js"]
```

**Step 2: Create .dockerignore**

```
node_modules
.env
__tests__
*.test.js
```

**Step 3: Build and test**

```bash
docker build -t connector-service .
docker run -p 3100:3100 connector-service
# Test: curl http://localhost:3100/health
```

**Step 4: Commit**
```bash
git commit -am "chore: add Dockerfile for connector service"
```

---

## Final State

After all tasks — 29 connectors across 5 categories:

```
services/connector-service/
├── Dockerfile
├── .dockerignore
├── .env.example
├── package.json
├── src/
│   ├── index.js                    (Express server)
│   ├── routes/
│   │   ├── connections.js          (list types, get options, test connection)
│   │   └── query.js                (execute query)
│   └── connectors/
│       ├── index.js                (registry: getConnector, listConnectors, register)
│       │
│       │── # Files (upload → query)
│       ├── csv.js                  (Evidence OSS)
│       ├── parquet.js              (built — DuckDB read_parquet)
│       ├── json.js                 (built — DuckDB read_json)
│       ├── excel.js                (built — xlsx → DuckDB)
│       │
│       │── # Databases (connect → query)
│       ├── postgres.js             (Evidence OSS)
│       ├── mysql.js                (Evidence OSS)
│       ├── bigquery.js             (Evidence OSS)
│       ├── snowflake.js            (Evidence OSS)
│       ├── mssql.js                (Evidence OSS)
│       ├── sqlite.js               (Evidence OSS)
│       ├── duckdb.js               (Evidence OSS)
│       ├── redshift.js             (Evidence OSS)
│       ├── databricks.js           (Evidence OSS)
│       ├── trino.js                (Evidence OSS)
│       ├── motherduck.js           (Evidence OSS)
│       ├── athena.js               (built — AWS SDK)
│       ├── azure-sql.js            (built — mssql + Azure AD auth)
│       ├── azure-postgres.js       (built — pg + Azure AD auth)
│       ├── rds-postgres.js         (built — pg + IAM auth)
│       ├── gcp-postgres.js         (built — pg + GCP IAM auth)
│       │
│       │── # Object Storage (connect → query in-place)
│       ├── s3.js                   (built — DuckDB httpfs)
│       ├── gcs.js                  (built — DuckDB httpfs)
│       ├── azure-blob.js           (built — DuckDB httpfs)
│       ├── cloudflare-r2.js        (built — S3-compatible variant)
│       ├── backblaze-b2.js         (built — S3-compatible variant)
│       │
│       │── # Data Lakes (connect → query via catalog)
│       ├── iceberg.js              (built — DuckDB iceberg_scan)
│       ├── delta-lake.js           (built — DuckDB delta_scan)
│       │
│       │── # Utility
│       ├── faker.js                (Evidence OSS — test data)
│       ├── javascript.js           (Evidence OSS — custom JS)
│       │
│       └── __tests__/
│           ├── postgres.test.js
│           ├── mysql.test.js
│           └── ... (one per connector)

services/platform-api/
├── app/infra/connector_client.py   (HTTP client to connector service)
├── app/api/routes/connections.py   (extended with connector-service proxy endpoints)
```

**Summary:** 14 migrated from Evidence OSS (MIT), 15 built ourselves (4 trivial cloud DB variants, 2 trivial S3-compatible variants, 9 moderate builds using existing npm SDKs + DuckDB extensions). Platform-api proxies to connector service. Frontend calls platform-api. Clean boundary.
