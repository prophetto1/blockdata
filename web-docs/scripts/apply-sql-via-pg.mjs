#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;

function parseArgs(argv) {
  const out = {
    file: '',
    envFile: '.env',
    verify: [],
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--file') out.file = argv[++i];
    else if (a === '--env') out.envFile = argv[++i];
    else if (a === '--verify') out.verify.push(argv[++i]);
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!out.file) throw new Error('Missing required --file <path-to-sql>');
  return out;
}

function loadEnv(filePath) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) throw new Error(`Env file not found: ${abs}`);
  const data = fs.readFileSync(abs, 'utf8');
  const env = {};
  for (const raw of data.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i === -1) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[k] = v;
  }
  return env;
}

function parseVerify(verifyArgs) {
  const out = [];
  for (const item of verifyArgs) {
    const [table, rawCount] = item.split('=');
    if (!table || !rawCount) throw new Error(`Invalid --verify value: ${item}. Expected table=count`);
    const count = Number(rawCount);
    if (!Number.isInteger(count) || count < 0) throw new Error(`Invalid verify count for ${item}`);
    out.push({ table, count });
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const env = loadEnv(args.envFile);
  const sqlFile = path.resolve(args.file);
  const verify = parseVerify(args.verify);

  if (!fs.existsSync(sqlFile)) throw new Error(`SQL file not found: ${sqlFile}`);
  const sql = fs.readFileSync(sqlFile, 'utf8');
  if (!sql.trim()) throw new Error(`SQL file is empty: ${sqlFile}`);
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL missing from env file');

  const client = new Client({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query("SET statement_timeout TO '0'");
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    const verification = [];
    for (const check of verify) {
      const r = await client.query(`SELECT COUNT(*)::int AS c FROM public.${check.table}`);
      const actual = r.rows[0].c;
      verification.push({
        table: check.table,
        expected: check.count,
        actual,
        ok: actual === check.count,
      });
    }

    const failed = verification.filter((v) => !v.ok);
    console.log(JSON.stringify({
      ok: failed.length === 0,
      sql_file: sqlFile,
      bytes: Buffer.byteLength(sql, 'utf8'),
      verification,
    }, null, 2));

    if (failed.length > 0) process.exit(2);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(String(err.stack || err));
  process.exit(1);
});

