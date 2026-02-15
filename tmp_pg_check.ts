import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const dsn = Deno.env.get("DATABASE_URL");
if (!dsn) throw new Error("Missing DATABASE_URL");

const client = new Client(dsn);
await client.connect();

const cons = await client.queryObject<{ conname: string; def: string }>(
  "select conname, pg_get_constraintdef(oid) as def from pg_constraint where conrelid='public.conversion_representations_v2'::regclass order by conname",
);
const idx = await client.queryObject<{ indexname: string; indexdef: string }>(
  "select indexname, indexdef from pg_indexes where schemaname='public' and tablename='conversion_representations_v2' order by indexname",
);

console.log("CONSTRAINTS");
for (const r of cons.rows) console.log(`${r.conname} | ${r.def}`);
console.log("INDEXES");
for (const r of idx.rows) console.log(`${r.indexname} | ${r.indexdef}`);

await client.end();