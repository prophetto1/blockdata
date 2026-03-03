#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TABLE_SPECS = [
  {
    table: 'kestra_provider_enrichment',
    source: 'provider_enrichment.jsonl',
    includeGeneratedId: false,
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
    sortBy: ['plugin_group'],
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
    sortBy: ['plugin_item_id', 'param_name'],
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
    sortBy: ['plugin_item_id', 'output_name'],
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
    sortBy: ['plugin_item_id', 'example_index'],
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
    sortBy: ['plugin_item_id', 'def_name'],
  },
];

function parseArgs(argv) {
  const out = {
    inputDir: 'e:/kestra-apis/output',
    generatedDir: 'e:/writing-system/.tmp/068-deterministic/chunks',
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--input') out.inputDir = argv[++i];
    else if (arg === '--generated') out.generatedDir = argv[++i];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return out;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function canonicalizeJson(value) {
  if (value === null) return null;
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value).sort()) out[k] = canonicalizeJson(value[k]);
    return out;
  }
  return value;
}

function normalizeJsonField(raw) {
  if (raw === null || raw === undefined) return null;
  let parsed = raw;
  if (typeof raw === 'string') parsed = JSON.parse(raw);
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
    case 'uuid':
      assert(typeof value === 'string' && UUID_RE.test(value), `Invalid UUID for ${col.name} in ${rowCtx}`);
      return value;
    case 'text':
      if (typeof value === 'string') return value;
      if (typeof value === 'number' || typeof value === 'boolean') return String(value);
      if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(canonicalizeJson(value));
      throw new Error(`Unsupported text value for ${col.name} in ${rowCtx}`);
    case 'bool':
      if (typeof value === 'boolean') return value;
      if (value === 'true') return true;
      if (value === 'false') return false;
      throw new Error(`Expected boolean for ${col.name} in ${rowCtx}`);
    case 'int':
      if (Number.isInteger(value)) return value;
      if (typeof value === 'string' && /^-?\d+$/.test(value)) return Number(value);
      throw new Error(`Expected integer for ${col.name} in ${rowCtx}`);
    case 'jsonb':
      return normalizeJsonField(value);
    default:
      throw new Error(`Unsupported type ${col.type}`);
  }
}

function normalizeRowsFromJsonl(filePath, spec) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const rows = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    const obj = JSON.parse(line);
    const row = {};
    for (const col of spec.columns) {
      row[col.name] = normalizeValue(obj[col.name], col, `${spec.source}:${i + 1}`);
    }
    rows.push(row);
  }
  return rows;
}

function rowKey(row, cols) {
  return cols.map((c) => JSON.stringify(row[c])).join('|');
}

function stableCompare(a, b, cols) {
  for (const c of cols) {
    const as = typeof a[c] === 'string' ? a[c] : JSON.stringify(a[c]);
    const bs = typeof b[c] === 'string' ? b[c] : JSON.stringify(b[c]);
    if (as < bs) return -1;
    if (as > bs) return 1;
  }
  return 0;
}

function dedupeAndSort(rows, spec) {
  const m = new Map();
  for (const row of rows) {
    const k = rowKey(row, spec.uniqueBy);
    if (!m.has(k)) {
      m.set(k, row);
      continue;
    }
    const prev = m.get(k);
    if (JSON.stringify(prev) !== JSON.stringify(row)) {
      throw new Error(`Conflicting duplicate in source for ${spec.table} key ${k}`);
    }
  }
  return Array.from(m.values()).sort((a, b) => stableCompare(a, b, spec.sortBy));
}

function extractInsertHeader(sql) {
  const m = sql.match(/INSERT\s+INTO\s+public\.([a-z_]+)\s*\(([^]*?)\)\s*VALUES/i);
  if (!m) throw new Error('Missing INSERT header');
  return {
    table: m[1],
    columns: m[2].split(',').map((x) => x.trim()).filter(Boolean),
  };
}

function extractValueBody(sql) {
  const iValues = sql.search(/\bVALUES\b/i);
  if (iValues === -1) throw new Error('Missing VALUES');
  let iConflict = sql.lastIndexOf('\nON CONFLICT ');
  if (iConflict === -1) iConflict = sql.lastIndexOf('ON CONFLICT ');
  if (iConflict === -1) throw new Error('Missing ON CONFLICT');
  return sql.slice(iValues + 'VALUES'.length, iConflict);
}

function extractTuples(body) {
  const tuples = [];
  let inQuote = false;
  let depth = 0;
  let start = -1;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (inQuote) {
      if (ch === "'") {
        if (body[i + 1] === "'") i += 1;
        else inQuote = false;
      }
      continue;
    }
    if (ch === "'") {
      inQuote = true;
      continue;
    }
    if (ch === '(') {
      if (depth === 0) start = i + 1;
      depth += 1;
      continue;
    }
    if (ch === ')') {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        tuples.push(body.slice(start, i));
        start = -1;
      }
    }
  }
  return tuples;
}

function splitTopLevelCsv(s) {
  const out = [];
  let inQuote = false;
  let cur = '';
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (inQuote) {
      cur += ch;
      if (ch === "'") {
        if (s[i + 1] === "'") {
          cur += s[i + 1];
          i += 1;
        } else {
          inQuote = false;
        }
      }
      continue;
    }
    if (ch === "'") {
      inQuote = true;
      cur += ch;
      continue;
    }
    if (ch === ',') {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function parseSqlStringToken(token) {
  assert(token.startsWith("'"), `Expected quoted string token: ${token.slice(0, 40)}`);
  let out = '';
  for (let i = 1; i < token.length; i += 1) {
    const ch = token[i];
    if (ch === "'") {
      if (token[i + 1] === "'") {
        out += "'";
        i += 1;
      } else {
        return { value: out, rest: token.slice(i + 1) };
      }
    } else {
      out += ch;
    }
  }
  throw new Error(`Unterminated SQL string token: ${token.slice(0, 80)}`);
}

function parseTokenByType(token, type) {
  if (token === 'NULL') return null;
  if (type === 'bool') {
    if (token === 'true') return true;
    if (token === 'false') return false;
    throw new Error(`Invalid boolean token: ${token}`);
  }
  if (type === 'int') {
    assert(/^-?\d+$/.test(token), `Invalid integer token: ${token}`);
    return Number(token);
  }
  if (type === 'jsonb') {
    const { value, rest } = parseSqlStringToken(token);
    assert(rest.trim() === '::jsonb', `Expected ::jsonb suffix, got: ${rest}`);
    return canonicalizeJson(JSON.parse(value));
  }
  if (type === 'text' || type === 'uuid') {
    const { value, rest } = parseSqlStringToken(token);
    assert(rest.trim() === '', `Unexpected suffix for text/uuid token: ${rest}`);
    return value;
  }
  throw new Error(`Unsupported type: ${type}`);
}

function parseGeneratedRowsForTable(chunkDir, spec) {
  const files = fs.readdirSync(chunkDir).filter((n) => n.endsWith('.sql')).sort();
  const rows = [];
  for (const file of files) {
    const sql = fs.readFileSync(path.join(chunkDir, file), 'utf8');
    const header = extractInsertHeader(sql);
    assert(header.table === spec.table, `Wrong table in ${file}: ${header.table}`);

    const expectedCols = spec.includeGeneratedId
      ? ['id', ...spec.columns.map((c) => c.name)]
      : spec.columns.map((c) => c.name);
    assert(JSON.stringify(header.columns) === JSON.stringify(expectedCols), `Column mismatch in ${file}`);

    const colType = new Map();
    if (spec.includeGeneratedId) colType.set('id', 'int');
    for (const c of spec.columns) colType.set(c.name, c.type);

    const tuples = extractTuples(extractValueBody(sql));
    for (const t of tuples) {
      const fields = splitTopLevelCsv(t);
      assert(fields.length === header.columns.length, `Field count mismatch in ${file}`);
      const row = {};
      for (let i = 0; i < header.columns.length; i += 1) {
        const col = header.columns[i];
        row[col] = parseTokenByType(fields[i], colType.get(col));
      }
      rows.push(row);
    }
  }
  return rows;
}

function canonicalForCompare(row, spec) {
  const out = {};
  for (const c of spec.columns) out[c.name] = row[c.name];
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  const inputDir = path.resolve(args.inputDir);
  const generatedDir = path.resolve(args.generatedDir);

  const summary = {};
  for (const spec of TABLE_SPECS) {
    const sourceRows = dedupeAndSort(
      normalizeRowsFromJsonl(path.join(inputDir, spec.source), spec),
      spec,
    );

    const generatedRows = parseGeneratedRowsForTable(path.join(generatedDir, spec.table), spec);
    assert(generatedRows.length === sourceRows.length, `${spec.table}: row count mismatch source=${sourceRows.length} generated=${generatedRows.length}`);

    if (spec.includeGeneratedId) {
      for (let i = 0; i < generatedRows.length; i += 1) {
        assert(generatedRows[i].id === i + 1, `${spec.table}: non-contiguous id at row ${i + 1}, got ${generatedRows[i].id}`);
      }
    }

    const generatedByKey = new Map();
    for (const row of generatedRows) {
      const k = rowKey(row, spec.uniqueBy);
      assert(!generatedByKey.has(k), `${spec.table}: duplicate generated key ${k}`);
      generatedByKey.set(k, canonicalForCompare(row, spec));
    }

    for (const src of sourceRows) {
      const k = rowKey(src, spec.uniqueBy);
      assert(generatedByKey.has(k), `${spec.table}: missing key ${k}`);
      const got = generatedByKey.get(k);
      const a = JSON.stringify(canonicalizeJson(src));
      const b = JSON.stringify(canonicalizeJson(got));
      assert(a === b, `${spec.table}: value mismatch for key ${k}`);
    }

    summary[spec.table] = {
      rows: sourceRows.length,
      keys: sourceRows.length,
      ids_contiguous: !!spec.includeGeneratedId,
      status: 'ok',
    };
  }

  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

try {
  main();
} catch (err) {
  console.error(String(err.stack || err));
  process.exit(1);
}
