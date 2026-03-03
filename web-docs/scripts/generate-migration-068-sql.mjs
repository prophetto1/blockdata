#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TABLE_SPECS = [
  {
    table: 'kestra_provider_enrichment',
    source: 'provider_enrichment.jsonl',
    columns: [
      { name: 'plugin_group', type: 'text', required: true },
      { name: 'provider_name', type: 'text', required: true },
      { name: 'provider_base_url', type: 'text', required: false },
      { name: 'provider_docs_url', type: 'text', required: false },
      { name: 'auth_type', type: 'text', required: false },
      { name: 'auth_fields', type: 'jsonb', required: true },
      { name: 'is_internal', type: 'bool', required: true },
    ],
    uniqueBy: ['plugin_group'],
    conflictBy: ['plugin_group'],
    sortBy: ['plugin_group'],
    chunkPrefix: 'provider',
  },
  {
    table: 'kestra_plugin_inputs',
    source: 'plugin_inputs.jsonl',
    includeGeneratedId: true,
    columns: [
      { name: 'plugin_item_id', type: 'uuid', required: true },
      { name: 'param_name', type: 'text', required: true },
      { name: 'param_type', type: 'text', required: false },
      { name: 'param_title', type: 'text', required: false },
      { name: 'param_description', type: 'text', required: false },
      { name: 'param_required', type: 'bool', required: true },
      { name: 'param_dynamic', type: 'bool', required: false },
      { name: 'param_default', type: 'text', required: false },
      { name: 'param_enum', type: 'jsonb', required: false },
      { name: 'param_format', type: 'text', required: false },
      { name: 'param_deprecated', type: 'bool', required: true },
      { name: 'param_group', type: 'text', required: false },
      { name: 'param_ref', type: 'text', required: false },
      { name: 'param_items_type', type: 'text', required: false },
      { name: 'param_any_of', type: 'jsonb', required: false },
    ],
    uniqueBy: ['plugin_item_id', 'param_name'],
    conflictBy: ['plugin_item_id', 'param_name'],
    sortBy: ['plugin_item_id', 'param_name'],
    chunkPrefix: 'inputs',
  },
  {
    table: 'kestra_plugin_outputs',
    source: 'plugin_outputs.jsonl',
    includeGeneratedId: true,
    columns: [
      { name: 'plugin_item_id', type: 'uuid', required: true },
      { name: 'output_name', type: 'text', required: true },
      { name: 'output_type', type: 'text', required: false },
      { name: 'output_title', type: 'text', required: false },
      { name: 'output_description', type: 'text', required: false },
      { name: 'output_required', type: 'bool', required: true },
      { name: 'output_format', type: 'text', required: false },
      { name: 'output_ref', type: 'text', required: false },
      { name: 'output_items_type', type: 'text', required: false },
    ],
    uniqueBy: ['plugin_item_id', 'output_name'],
    conflictBy: ['plugin_item_id', 'output_name'],
    sortBy: ['plugin_item_id', 'output_name'],
    chunkPrefix: 'outputs',
  },
  {
    table: 'kestra_plugin_examples',
    source: 'plugin_examples.jsonl',
    includeGeneratedId: true,
    columns: [
      { name: 'plugin_item_id', type: 'uuid', required: true },
      { name: 'example_index', type: 'int', required: true },
      { name: 'example_title', type: 'text', required: true },
      { name: 'example_code', type: 'text', required: true },
      { name: 'example_lang', type: 'text', required: true },
      { name: 'example_full', type: 'bool', required: true },
    ],
    uniqueBy: ['plugin_item_id', 'example_index'],
    conflictBy: ['plugin_item_id', 'example_index'],
    sortBy: ['plugin_item_id', 'example_index'],
    chunkPrefix: 'examples',
  },
  {
    table: 'kestra_plugin_definitions',
    source: 'plugin_definitions.jsonl',
    includeGeneratedId: true,
    columns: [
      { name: 'plugin_item_id', type: 'uuid', required: true },
      { name: 'def_name', type: 'text', required: true },
      { name: 'def_type', type: 'text', required: false },
      { name: 'def_required', type: 'jsonb', required: false },
      { name: 'def_properties', type: 'jsonb', required: true },
    ],
    uniqueBy: ['plugin_item_id', 'def_name'],
    conflictBy: ['plugin_item_id', 'def_name'],
    sortBy: ['plugin_item_id', 'def_name'],
    chunkPrefix: 'definitions',
  },
];

function parseArgs(argv) {
  const out = {
    inputDir: 'e:/kestra-apis/output',
    outDir: 'e:/writing-system/.tmp/068-deterministic',
    chunkSize: 1500,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--input') out.inputDir = argv[++i];
    else if (arg === '--out') out.outDir = argv[++i];
    else if (arg === '--chunk-size') out.chunkSize = Number(argv[++i]);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!Number.isInteger(out.chunkSize) || out.chunkSize <= 0) {
    throw new Error(`Invalid --chunk-size: ${out.chunkSize}`);
  }
  return out;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function readJsonl(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const rows = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      rows.push(JSON.parse(line));
    } catch (err) {
      throw new Error(`Invalid JSONL at ${filePath}:${i + 1} - ${String(err)}`);
    }
  }
  return rows;
}

function canonicalizeJson(value) {
  if (value === null) return null;
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (typeof value === 'object') {
    const out = {};
    const keys = Object.keys(value).sort();
    for (const key of keys) out[key] = canonicalizeJson(value[key]);
    return out;
  }
  return value;
}

function normalizeJsonField(raw) {
  if (raw === null || raw === undefined) return null;
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`Expected JSON value but got non-JSON string: ${raw.slice(0, 80)}`);
    }
  }
  return canonicalizeJson(parsed);
}

function normalizeValue(value, col, rowCtx) {
  if (value === undefined) {
    if (col.required) throw new Error(`Missing required field "${col.name}" in ${rowCtx}`);
    return null;
  }
  if (value === null) {
    if (col.required) throw new Error(`Null required field "${col.name}" in ${rowCtx}`);
    return null;
  }

  switch (col.type) {
    case 'uuid': {
      assert(typeof value === 'string' && UUID_RE.test(value), `Invalid UUID for ${col.name} in ${rowCtx}`);
      return value;
    }
    case 'text': {
      if (typeof value === 'string') return value;
      if (typeof value === 'number' || typeof value === 'boolean') return String(value);
      if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
        return JSON.stringify(canonicalizeJson(value));
      }
      throw new Error(`Unsupported text value for ${col.name} in ${rowCtx}`);
    }
    case 'bool': {
      if (typeof value === 'boolean') return value;
      if (value === 'true') return true;
      if (value === 'false') return false;
      throw new Error(`Expected boolean for ${col.name} in ${rowCtx}`);
    }
    case 'int': {
      if (Number.isInteger(value)) return value;
      if (typeof value === 'string' && /^-?\d+$/.test(value)) return Number(value);
      throw new Error(`Expected integer for ${col.name} in ${rowCtx}`);
    }
    case 'jsonb': {
      return normalizeJsonField(value);
    }
    default:
      throw new Error(`Unsupported type: ${col.type}`);
  }
}

function normalizeRow(rawRow, spec, rowIndex) {
  assert(rawRow && typeof rawRow === 'object' && !Array.isArray(rawRow), `Expected object at ${spec.source} line ${rowIndex + 1}`);
  const allowed = new Set(spec.columns.map((c) => c.name));
  for (const key of Object.keys(rawRow)) {
    assert(allowed.has(key), `Unexpected field "${key}" in ${spec.source} line ${rowIndex + 1}`);
  }

  const normalized = {};
  for (const col of spec.columns) {
    normalized[col.name] = normalizeValue(rawRow[col.name], col, `${spec.source} line ${rowIndex + 1}`);
  }
  return normalized;
}

function rowKey(row, cols) {
  return cols.map((c) => JSON.stringify(row[c])).join('|');
}

function stableCompare(a, b, cols) {
  for (const col of cols) {
    const av = a[col];
    const bv = b[col];
    const as = typeof av === 'string' ? av : JSON.stringify(av);
    const bs = typeof bv === 'string' ? bv : JSON.stringify(bv);
    if (as < bs) return -1;
    if (as > bs) return 1;
  }
  return 0;
}

function dedupeRows(rows, spec) {
  const byKey = new Map();
  let exactDupes = 0;
  for (const row of rows) {
    const key = rowKey(row, spec.uniqueBy);
    if (!byKey.has(key)) {
      byKey.set(key, row);
      continue;
    }
    const prev = byKey.get(key);
    const prevJson = JSON.stringify(prev);
    const currJson = JSON.stringify(row);
    if (prevJson === currJson) {
      exactDupes += 1;
      continue;
    }
    throw new Error(`Conflicting duplicate key for ${spec.table} on (${spec.uniqueBy.join(', ')}): ${key}`);
  }
  const uniqueRows = Array.from(byKey.values()).sort((a, b) => stableCompare(a, b, spec.sortBy));
  return { uniqueRows, exactDupes };
}

function sqlQuoteString(s) {
  return `'${s.replaceAll("'", "''")}'`;
}

function toSqlValue(value, type) {
  if (value === null) return 'NULL';
  if (type === 'bool') return value ? 'true' : 'false';
  if (type === 'int') return String(value);
  if (type === 'jsonb') {
    const canonical = JSON.stringify(canonicalizeJson(value));
    return `${sqlQuoteString(canonical)}::jsonb`;
  }
  return sqlQuoteString(value);
}

function buildInsertSql(spec, rows, withTruncate) {
  const valueColumns = spec.includeGeneratedId
    ? [{ name: 'id', type: 'int' }, ...spec.columns]
    : spec.columns;
  const colNames = valueColumns.map((c) => c.name);
  const out = [];
  if (withTruncate) out.push(`TRUNCATE public.${spec.table} RESTART IDENTITY CASCADE;`);
  if (rows.length === 0) {
    out.push(`-- No rows for ${spec.table}`);
    return out.join('\n') + '\n';
  }

  out.push(`INSERT INTO public.${spec.table}`);
  out.push(`  (${colNames.join(', ')})`);
  out.push('VALUES');

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const values = valueColumns.map((c) => toSqlValue(row[c.name], c.type));
    const suffix = i === rows.length - 1 ? '' : ',';
    out.push(`  (${values.join(', ')})${suffix}`);
  }

  out.push(`ON CONFLICT (${spec.conflictBy.join(', ')}) DO NOTHING;`);
  return out.join('\n') + '\n';
}

function hashFile(filePath) {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(filePath));
  return h.digest('hex');
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  return {
    file: filePath,
    bytes: Buffer.byteLength(content, 'utf8'),
    sha256: hashFile(filePath),
  };
}

function chunkRows(rows, chunkSize) {
  const chunks = [];
  for (let i = 0; i < rows.length; i += chunkSize) {
    chunks.push(rows.slice(i, i + chunkSize));
  }
  return chunks;
}

function main() {
  const args = parseArgs(process.argv);
  const outDir = path.resolve(args.outDir);
  const inputDir = path.resolve(args.inputDir);
  fs.mkdirSync(outDir, { recursive: true });

  const manifest = {
    generated_at_utc: new Date().toISOString(),
    input_dir: inputDir,
    out_dir: outDir,
    chunk_size: args.chunkSize,
    tables: {},
    files: [],
  };

  const fullSqlParts = [
    '-- Migration 068 deterministic seed output',
    `-- Generated at ${manifest.generated_at_utc}`,
    `-- Source directory: ${inputDir}`,
    '',
  ];

  for (const spec of TABLE_SPECS) {
    const srcPath = path.join(inputDir, spec.source);
    assert(fs.existsSync(srcPath), `Missing source file: ${srcPath}`);

    const rawRows = readJsonl(srcPath);
    const normalizedRows = rawRows.map((r, i) => normalizeRow(r, spec, i));
    const { uniqueRows, exactDupes } = dedupeRows(normalizedRows, spec);
    const preparedRows = spec.includeGeneratedId
      ? uniqueRows.map((row, idx) => ({ id: idx + 1, ...row }))
      : uniqueRows;

    const fullBlock = buildInsertSql(spec, preparedRows, true);
    fullSqlParts.push(`-- ${spec.table}`);
    fullSqlParts.push(fullBlock);

    const tableDir = path.join(outDir, 'chunks', spec.table);
    fs.mkdirSync(tableDir, { recursive: true });
    const chunks = chunkRows(preparedRows, args.chunkSize);
    const chunkFiles = [];
    for (let i = 0; i < chunks.length; i += 1) {
      const chunkSql = buildInsertSql(spec, chunks[i], i === 0);
      const chunkName = `068_${spec.chunkPrefix}_chunk_${String(i).padStart(3, '0')}.sql`;
      const chunkPath = path.join(tableDir, chunkName);
      chunkFiles.push({
        index: i,
        rows: chunks[i].length,
        ...writeFile(chunkPath, chunkSql),
      });
    }

    manifest.tables[spec.table] = {
      source_file: srcPath,
      input_rows: rawRows.length,
      unique_rows: preparedRows.length,
      exact_duplicate_rows_removed: exactDupes,
      chunk_count: chunkFiles.length,
      chunks: chunkFiles,
    };
    manifest.files.push(...chunkFiles);
  }

  const fullSqlPath = path.join(outDir, '068_kestra_plugin_satellite_seed.generated.sql');
  const fullSql = fullSqlParts.join('\n');
  const fullMeta = writeFile(fullSqlPath, fullSql);
  manifest.full_sql = {
    ...fullMeta,
    file: fullSqlPath,
  };
  manifest.files.push(fullMeta);

  const manifestPath = path.join(outDir, 'manifest.json');
  writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  console.log(JSON.stringify({
    ok: true,
    out_dir: outDir,
    full_sql: fullSqlPath,
    manifest: manifestPath,
    table_counts: Object.fromEntries(
      Object.entries(manifest.tables).map(([k, v]) => [k, v.unique_rows]),
    ),
  }, null, 2));
}

try {
  main();
} catch (err) {
  console.error(String(err.stack || err));
  process.exit(1);
}
