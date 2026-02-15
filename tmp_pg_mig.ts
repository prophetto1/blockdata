import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";
const dsn = Deno.env.get("DATABASE_URL");
if (!dsn) throw new Error("Missing DATABASE_URL");
const c = new Client(dsn);
await c.connect();
const rows = await c.queryObject<{version:string}>(
  "select version from supabase_migrations.schema_migrations where version in ('20260213153000','20260214190500','20260214233000','20260214234500') order by version",
);
console.log('MIGRATIONS=' + rows.rows.map((r)=>r.version).join(','));
await c.end();