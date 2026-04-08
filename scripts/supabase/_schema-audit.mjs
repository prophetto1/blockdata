#!/usr/bin/env node
/**
 * _schema-audit.mjs
 * Full schema inventory for the public schema of the Supabase Postgres database.
 *
 * Reads DATABASE_URL from ../.env and prints:
 *   1. All base tables with columns (name, type, nullable, default)
 *   2. All views with their SQL definitions
 *   3. All foreign-key relationships
 *   4. All indexes
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ── Load .env manually (no dotenv dependency) ──────────────────────── */
function loadEnv() {
  const envPath = resolve(__dirname, "..", ".env");
  const text = readFileSync(envPath, "utf-8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    // strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not found in .env");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* ── Queries ─────────────────────────────────────────────────────────── */

const Q_TABLES = `
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
  ORDER BY table_name;
`;

const Q_COLUMNS = `
  SELECT
    c.table_name,
    c.column_name,
    c.data_type,
    c.udt_name,
    c.is_nullable,
    c.column_default,
    c.character_maximum_length,
    c.ordinal_position
  FROM information_schema.columns c
  JOIN information_schema.tables t
    ON t.table_schema = c.table_schema AND t.table_name = c.table_name
  WHERE c.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
  ORDER BY c.table_name, c.ordinal_position;
`;

const Q_VIEWS = `
  SELECT table_name AS view_name, view_definition
  FROM information_schema.views
  WHERE table_schema = 'public'
  ORDER BY table_name;
`;

const Q_FK = `
  SELECT
    tc.table_name       AS from_table,
    kcu.column_name     AS from_column,
    ccu.table_name      AS to_table,
    ccu.column_name     AS to_column,
    tc.constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
   AND ccu.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
  ORDER BY tc.table_name, tc.constraint_name;
`;

const Q_INDEXES = `
  SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
  FROM pg_indexes
  WHERE schemaname = 'public'
  ORDER BY tablename, indexname;
`;

/* ── Main ────────────────────────────────────────────────────────────── */

async function main() {
  await client.connect();

  const [resTables, resCols, resViews, resFK, resIdx] = await Promise.all([
    client.query(Q_TABLES),
    client.query(Q_COLUMNS),
    client.query(Q_VIEWS),
    client.query(Q_FK),
    client.query(Q_INDEXES),
  ]);

  /* -- Group columns by table ---------------------------------------- */
  const colsByTable = {};
  for (const r of resCols.rows) {
    (colsByTable[r.table_name] ||= []).push(r);
  }

  /* ================================================================== */
  console.log("=".repeat(80));
  console.log("  SCHEMA AUDIT — public schema");
  console.log("  Generated: " + new Date().toISOString());
  console.log("=".repeat(80));

  /* 1. Tables + columns ---------------------------------------------- */
  console.log("\n" + "─".repeat(80));
  console.log("  1. BASE TABLES & COLUMNS");
  console.log("─".repeat(80));

  for (const t of resTables.rows) {
    const name = t.table_name;
    console.log(`\n  TABLE: ${name}`);
    const cols = colsByTable[name] || [];
    if (cols.length === 0) {
      console.log("    (no columns)");
      continue;
    }
    // header
    console.log(
      "    " +
        "Column".padEnd(40) +
        "Type".padEnd(30) +
        "Nullable".padEnd(10) +
        "Default"
    );
    console.log("    " + "-".repeat(110));
    for (const c of cols) {
      const typ =
        c.data_type === "USER-DEFINED"
          ? c.udt_name
          : c.character_maximum_length
          ? `${c.data_type}(${c.character_maximum_length})`
          : c.data_type;
      const def = c.column_default ?? "";
      console.log(
        "    " +
          c.column_name.padEnd(40) +
          typ.padEnd(30) +
          c.is_nullable.padEnd(10) +
          def
      );
    }
  }

  /* 2. Views --------------------------------------------------------- */
  console.log("\n" + "─".repeat(80));
  console.log("  2. VIEWS");
  console.log("─".repeat(80));

  if (resViews.rows.length === 0) {
    console.log("\n  (no views in public schema)");
  }
  for (const v of resViews.rows) {
    console.log(`\n  VIEW: ${v.view_name}`);
    console.log("  DEFINITION:");
    const def = (v.view_definition || "").trim();
    for (const line of def.split(/\n/)) {
      console.log("    " + line);
    }
  }

  /* 3. Foreign keys -------------------------------------------------- */
  console.log("\n" + "─".repeat(80));
  console.log("  3. FOREIGN KEY RELATIONSHIPS");
  console.log("─".repeat(80));

  if (resFK.rows.length === 0) {
    console.log("\n  (no foreign keys in public schema)");
  } else {
    console.log(
      "\n    " +
        "Constraint".padEnd(50) +
        "From".padEnd(40) +
        "To"
    );
    console.log("    " + "-".repeat(120));
    for (const fk of resFK.rows) {
      console.log(
        "    " +
          fk.constraint_name.padEnd(50) +
          `${fk.from_table}.${fk.from_column}`.padEnd(40) +
          `${fk.to_table}.${fk.to_column}`
      );
    }
  }

  /* 4. Indexes ------------------------------------------------------- */
  console.log("\n" + "─".repeat(80));
  console.log("  4. INDEXES");
  console.log("─".repeat(80));

  if (resIdx.rows.length === 0) {
    console.log("\n  (no indexes in public schema)");
  }
  for (const ix of resIdx.rows) {
    console.log(`\n  TABLE: ${ix.tablename}  |  INDEX: ${ix.indexname}`);
    console.log(`    ${ix.indexdef}`);
  }

  console.log("\n" + "=".repeat(80));
  console.log("  END OF AUDIT");
  console.log("=".repeat(80));

  await client.end();
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});