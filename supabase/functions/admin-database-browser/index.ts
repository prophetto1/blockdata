import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { requireSuperuser, type SuperuserContext } from "../_shared/superuser.ts";

type AdminDatabaseBrowserDeps = {
  requireSuperuser: (req: Request) => Promise<SuperuserContext>;
  createAdminClient: () => ReturnType<typeof createAdminClient>;
};

const defaultDeps: AdminDatabaseBrowserDeps = {
  requireSuperuser,
  createAdminClient,
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

function parseBoundedInt(
  raw: string | null,
  fallback: number,
  minValue: number,
  maxValue: number,
): number {
  if (raw === null || raw.trim().length === 0) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  const intValue = Math.trunc(parsed);
  if (intValue < minValue) return minValue;
  if (intValue > maxValue) return maxValue;
  return intValue;
}

function asTrimmed(value: string | null): string {
  return value?.trim() ?? "";
}

function maybeSearch(value: string | null): string | null {
  const trimmed = asTrimmed(value);
  return trimmed.length > 0 ? trimmed : null;
}

function sortTables(rows: unknown[]): unknown[] {
  const next = [...rows];
  next.sort((a, b) => {
    const sa = String((a as { table_schema?: unknown }).table_schema ?? "");
    const sb = String((b as { table_schema?: unknown }).table_schema ?? "");
    if (sa !== sb) return sa.localeCompare(sb);
    return String((a as { table_name?: unknown }).table_name ?? "").localeCompare(
      String((b as { table_name?: unknown }).table_name ?? ""),
    );
  });
  return next;
}

function sortColumns(rows: unknown[]): unknown[] {
  const next = [...rows];
  next.sort((a, b) => {
    const oa = Number((a as { ordinal_position?: unknown }).ordinal_position ?? Number.POSITIVE_INFINITY);
    const ob = Number((b as { ordinal_position?: unknown }).ordinal_position ?? Number.POSITIVE_INFINITY);
    if (Number.isFinite(oa) && Number.isFinite(ob) && oa !== ob) return oa - ob;
    return String((a as { column_name?: unknown }).column_name ?? "").localeCompare(
      String((b as { column_name?: unknown }).column_name ?? ""),
    );
  });
  return next;
}

export async function handleAdminDatabaseBrowserRequest(
  req: Request,
  deps: AdminDatabaseBrowserDeps = defaultDeps,
): Promise<Response> {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  try {
    const superuser = await deps.requireSuperuser(req);
    const supabaseAdmin = deps.createAdminClient();

    if (req.method !== "GET") {
      return json(405, { error: "Method not allowed" });
    }

    const url = new URL(req.url);
    const tableSchema = asTrimmed(url.searchParams.get("table_schema"));
    const tableName = asTrimmed(url.searchParams.get("table_name"));

    if ((tableSchema.length > 0 && tableName.length === 0) || (tableSchema.length === 0 && tableName.length > 0)) {
      return json(400, { error: "table_schema and table_name must be provided together" });
    }

    if (!tableSchema && !tableName) {
      const { data: tablesData, error: tablesErr } = await supabaseAdmin.rpc("admin_list_tables");
      if (tablesErr) {
        return json(500, { error: `Failed to list tables: ${tablesErr.message}` });
      }

      const tables = Array.isArray(tablesData) ? sortTables(tablesData) : [];
      return json(200, {
        superuser: {
          user_id: superuser.userId,
          email: superuser.email,
        },
        tables,
      });
    }

    const limit = parseBoundedInt(url.searchParams.get("limit"), 50, 1, 500);
    const offset = parseBoundedInt(url.searchParams.get("offset"), 0, 0, 1_000_000_000);
    const search = maybeSearch(url.searchParams.get("search"));

    const [{ data: columnsData, error: columnsErr }, { data: rowsData, error: rowsErr }] = await Promise.all([
      supabaseAdmin.rpc("admin_list_columns", {
        p_table_schema: tableSchema,
        p_table_name: tableName,
      }),
      supabaseAdmin.rpc("admin_fetch_table_rows", {
        p_table_schema: tableSchema,
        p_table_name: tableName,
        p_limit: limit,
        p_offset: offset,
        p_search: search,
      }),
    ]);

    if (columnsErr) {
      const msg = columnsErr.message ?? "Unknown error";
      if (msg.toLowerCase().includes("unknown or disallowed table")) {
        return json(400, { error: msg });
      }
      return json(500, { error: `Failed to list columns: ${msg}` });
    }
    if (rowsErr) {
      const msg = rowsErr.message ?? "Unknown error";
      if (msg.toLowerCase().includes("unknown or disallowed table")) {
        return json(400, { error: msg });
      }
      return json(500, { error: `Failed to fetch rows: ${msg}` });
    }

    const columns = Array.isArray(columnsData) ? sortColumns(columnsData) : [];
    const resultRow = Array.isArray(rowsData) && rowsData.length > 0 && typeof rowsData[0] === "object" && rowsData[0] !== null
      ? (rowsData[0] as Record<string, unknown>)
      : null;

    const rawTotal = resultRow?.total_count;
    const totalRowsNumber = typeof rawTotal === "number"
      ? rawTotal
      : Number(typeof rawTotal === "string" ? rawTotal : 0);
    const totalRows = Number.isFinite(totalRowsNumber) ? Math.max(0, Math.trunc(totalRowsNumber)) : 0;

    const rowsValue = resultRow?.rows;
    const rows = Array.isArray(rowsValue) ? rowsValue : [];

    return json(200, {
      superuser: {
        user_id: superuser.userId,
        email: superuser.email,
      },
      table: {
        table_schema: tableSchema,
        table_name: tableName,
      },
      columns,
      rows,
      total_rows: totalRows,
      limit,
      offset,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Missing Authorization header") || msg.startsWith("Invalid auth")) {
      return json(401, { error: msg });
    }
    if (msg.includes("Forbidden: superuser access required")) {
      return json(403, { error: msg });
    }
    if (msg.includes("Superuser access is not configured")) {
      return json(503, { error: msg });
    }
    return json(500, { error: msg });
  }
}

if (import.meta.main) {
  Deno.serve((req) => handleAdminDatabaseBrowserRequest(req));
}
