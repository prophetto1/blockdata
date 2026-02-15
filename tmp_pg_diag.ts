import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const dsn = Deno.env.get("DATABASE_URL");
if (!dsn) throw new Error("Missing DATABASE_URL");

const c = new Client(dsn);
await c.connect();

const pub = await c.queryObject<{ pubname: string; tablename: string }>(
  "select pubname, tablename from pg_publication_tables where pubname='supabase_realtime' and tablename='documents_v2'",
);
const stale = await c.queryObject<{ c: number }>(
  "select count(*)::int as c from public.documents_v2 where status='converting' and uploaded_at < now() - interval '5 minutes'",
);
console.log('REALTIME_DOCS_V2=' + pub.rows.length);
console.log('STALE_CONVERTING_COUNT=' + (stale.rows[0]?.c ?? 0));

await c.end();