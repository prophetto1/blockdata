import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { requireSuperuser, type SuperuserContext } from "../_shared/superuser.ts";

type AdminIntegrationCatalogDeps = {
  requireSuperuser: (req: Request) => Promise<SuperuserContext>;
  createAdminClient: () => ReturnType<typeof createAdminClient>;
  fetch: (input: URL | Request | string, init?: RequestInit) => Promise<Response>;
  nowIso: () => string;
};

const defaultDeps: AdminIntegrationCatalogDeps = {
  requireSuperuser,
  createAdminClient,
  fetch: (input, init) => fetch(input, init),
  nowIso: () => new Date().toISOString(),
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function normalizeTaskClassInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const marker = "/plugins/";
  const markerIndex = trimmed.indexOf(marker);
  if (markerIndex >= 0) {
    return trimmed.slice(markerIndex + marker.length).replace(/\/+$/, "").trim();
  }
  return trimmed;
}

function fallbackTaskTitle(taskClass: string): string {
  const segments = taskClass.split(".");
  return segments[segments.length - 1] ?? taskClass;
}

function inferSuggestedServiceType(taskClass: string, pluginGroup: string | null): string {
  const value = `${taskClass} ${pluginGroup ?? ""}`.toLowerCase();
  if (value.includes(".dbt.")) return "dbt";
  if (value.includes(".docling.") || value.includes("document") || value.includes("parser")) return "docling";
  if (value.includes(".jdbc.") || value.includes(".sql.") || value.includes(".dlt.") || value.includes("sqlite")) return "dlt";
  if (value.includes("convert")) return "conversion";
  if (value.includes(".edge.") || value.includes("supabase")) return "edge";
  return "custom";
}

type KestraTask = {
  cls?: unknown;
  title?: unknown;
  description?: unknown;
};

type KestraPlugin = {
  name?: unknown;
  title?: unknown;
  group?: unknown;
  version?: unknown;
  categories?: unknown;
  tasks?: unknown;
};

type CatalogUpsertRow = {
  source: "kestra";
  external_id: string;
  plugin_name: string;
  plugin_title: string | null;
  plugin_group: string | null;
  plugin_version: string | null;
  categories: string[];
  task_class: string;
  task_title: string | null;
  task_description: string | null;
  suggested_service_type: string;
  last_synced_at: string;
};

function asOptionalNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeKestraPlugins(payload: unknown, nowIso: string): {
  rows: CatalogUpsertRow[];
  warnings: string[];
  duplicateCount: number;
} {
  if (!Array.isArray(payload)) {
    throw new Error("Kestra payload must be an array");
  }

  const map = new Map<string, CatalogUpsertRow>();
  const warnings: string[] = [];
  let duplicateCount = 0;

  for (const pluginRaw of payload as KestraPlugin[]) {
    if (!isPlainObject(pluginRaw)) continue;
    const pluginName = asOptionalNonEmptyString(pluginRaw.name) ?? "unknown-plugin";
    const pluginTitle = asOptionalNonEmptyString(pluginRaw.title);
    const pluginGroup = asOptionalNonEmptyString(pluginRaw.group);
    const pluginVersion = asOptionalNonEmptyString(pluginRaw.version);
    const categories = isStringArray(pluginRaw.categories) ? pluginRaw.categories : [];
    const tasksRaw = Array.isArray(pluginRaw.tasks) ? (pluginRaw.tasks as KestraTask[]) : [];

    for (const taskRaw of tasksRaw) {
      if (!isPlainObject(taskRaw)) continue;
      const taskClassInput = asOptionalNonEmptyString(taskRaw.cls);
      if (!taskClassInput) {
        warnings.push(`Plugin ${pluginName}: skipped task without cls.`);
        continue;
      }

      const taskClass = normalizeTaskClassInput(taskClassInput);
      if (!taskClass) {
        warnings.push(`Plugin ${pluginName}: skipped empty normalized task class.`);
        continue;
      }

      if (map.has(taskClass)) {
        duplicateCount += 1;
      }

      map.set(taskClass, {
        source: "kestra",
        external_id: taskClass,
        plugin_name: pluginName,
        plugin_title: pluginTitle,
        plugin_group: pluginGroup,
        plugin_version: pluginVersion,
        categories,
        task_class: taskClass,
        task_title: asOptionalNonEmptyString(taskRaw.title) ?? fallbackTaskTitle(taskClass),
        task_description: asOptionalNonEmptyString(taskRaw.description),
        suggested_service_type: inferSuggestedServiceType(taskClass, pluginGroup),
        last_synced_at: nowIso,
      });
    }
  }

  return {
    rows: [...map.values()],
    warnings,
    duplicateCount,
  };
}

export async function handleAdminIntegrationCatalogRequest(
  req: Request,
  deps: AdminIntegrationCatalogDeps = defaultDeps,
): Promise<Response> {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  try {
    const superuser = await deps.requireSuperuser(req);
    const supabaseAdmin = deps.createAdminClient();

    if (req.method === "GET") {
      const [{ data: items, error: itemsErr }, { data: services, error: servicesErr }, {
        data: functions,
        error: functionsErr,
      }] = await Promise.all([
        supabaseAdmin
          .from("integration_catalog_items")
          .select(
            "item_id,source,external_id,plugin_name,plugin_title,plugin_group,plugin_version,categories,task_class,task_title,task_description,task_schema,task_markdown,enabled,suggested_service_type,mapped_service_id,mapped_function_id,mapping_notes,source_updated_at,last_synced_at,updated_at",
          ),
        supabaseAdmin
          .from("service_registry")
          .select("service_id,service_type,service_name,base_url,enabled"),
        supabaseAdmin
          .from("service_functions")
          .select("function_id,service_id,function_name,function_type,label,entrypoint,enabled"),
      ]);

      if (itemsErr) return json(500, { error: `Failed to load catalog items: ${itemsErr.message}` });
      if (servicesErr) return json(500, { error: `Failed to load services: ${servicesErr.message}` });
      if (functionsErr) return json(500, { error: `Failed to load functions: ${functionsErr.message}` });

      const itemRows = Array.isArray(items) ? [...items] : [];
      itemRows.sort((a, b) => {
        const ga = String((a as { plugin_group?: unknown }).plugin_group ?? "");
        const gb = String((b as { plugin_group?: unknown }).plugin_group ?? "");
        if (ga !== gb) return ga.localeCompare(gb);
        return String((a as { task_class?: unknown }).task_class ?? "").localeCompare(
          String((b as { task_class?: unknown }).task_class ?? ""),
        );
      });

      const serviceRows = Array.isArray(services) ? [...services] : [];
      serviceRows.sort((a, b) =>
        String((a as { service_name?: unknown }).service_name ?? "").localeCompare(
          String((b as { service_name?: unknown }).service_name ?? ""),
        )
      );

      const functionRows = Array.isArray(functions) ? [...functions] : [];
      functionRows.sort((a, b) =>
        String((a as { function_name?: unknown }).function_name ?? "").localeCompare(
          String((b as { function_name?: unknown }).function_name ?? ""),
        )
      );

      return json(200, {
        superuser: {
          user_id: superuser.userId,
          email: superuser.email,
        },
        items: itemRows,
        services: serviceRows,
        functions: functionRows,
      });
    }

    if (req.method === "POST") {
      const body = await req.json().catch(() => null);
      if (!isPlainObject(body)) {
        return json(400, { error: "Invalid JSON body" });
      }

      const target = typeof body.target === "string" ? body.target.trim() : "";

      if (target === "sync_kestra") {
        const sourceUrl = typeof body.source_url === "string" && body.source_url.trim().length > 0
          ? body.source_url.trim()
          : "http://localhost:8080/api/v1/plugins";
        const dryRun = body.dry_run !== false;
        const onlyTaskClasses = isStringArray(body.only_task_classes)
          ? new Set(body.only_task_classes.map((value) => normalizeTaskClassInput(value)).filter((value) => value.length > 0))
          : null;

        const resp = await deps.fetch(sourceUrl, {
          method: "GET",
          headers: { Accept: "application/json" },
        }).catch((err) => {
          throw new Error(`Failed to fetch Kestra plugins: ${err instanceof Error ? err.message : String(err)}`);
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          return json(502, { error: `Kestra request failed: HTTP ${resp.status} ${text.slice(0, 500)}` });
        }

        const payload = await resp.json().catch(() => null);
        const nowIso = deps.nowIso();
        const normalized = normalizeKestraPlugins(payload, nowIso);
        const rows = onlyTaskClasses
          ? normalized.rows.filter((row) => onlyTaskClasses.has(row.task_class))
          : normalized.rows;

        const { data: existingRows, error: existingErr } = await supabaseAdmin
          .from("integration_catalog_items")
          .select("source,external_id");
        if (existingErr) return json(500, { error: `Failed to load existing catalog items: ${existingErr.message}` });

        const existing = new Set(
          (Array.isArray(existingRows) ? existingRows : [])
            .filter((row) => String((row as { source?: unknown }).source ?? "") === "kestra")
            .map((row) => String((row as { external_id?: unknown }).external_id ?? "")),
        );

        let updateCount = 0;
        for (const row of rows) {
          if (existing.has(row.external_id)) updateCount += 1;
        }
        const insertCount = rows.length - updateCount;

        if (dryRun) {
          return json(200, {
            ok: true,
            dry_run: true,
            source_url: sourceUrl,
            summary: {
              total_normalized: rows.length,
              would_insert: insertCount,
              would_update: updateCount,
              duplicate_classes_in_payload: normalized.duplicateCount,
            },
            warnings: normalized.warnings,
            preview: rows.slice(0, 50),
          });
        }

        if (rows.length > 0) {
          const { error: upsertErr } = await supabaseAdmin
            .from("integration_catalog_items")
            .upsert(rows, { onConflict: "source,external_id" });
          if (upsertErr) return json(500, { error: `Failed to sync catalog items: ${upsertErr.message}` });
        }

        return json(200, {
          ok: true,
          dry_run: false,
          source_url: sourceUrl,
          summary: {
            total_normalized: rows.length,
            inserted: insertCount,
            updated: updateCount,
            duplicate_classes_in_payload: normalized.duplicateCount,
          },
          warnings: normalized.warnings,
        });
      }

      if (target === "hydrate_detail") {
        const taskClassInput = typeof body.task_class === "string" ? body.task_class : "";
        const taskClass = normalizeTaskClassInput(taskClassInput);
        if (!taskClass) return json(400, { error: "Missing task_class" });

        const sourceUrl = typeof body.source_url === "string" && body.source_url.trim().length > 0
          ? body.source_url.trim()
          : `http://localhost:8080/api/v1/plugins/${encodeURIComponent(taskClass)}`;

        const resp = await deps.fetch(sourceUrl, {
          method: "GET",
          headers: { Accept: "application/json" },
        }).catch((err) => {
          throw new Error(`Failed to fetch Kestra task detail: ${err instanceof Error ? err.message : String(err)}`);
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          return json(502, { error: `Kestra detail request failed: HTTP ${resp.status} ${text.slice(0, 500)}` });
        }

        const detail = await resp.json().catch(() => null);
        if (!isPlainObject(detail)) {
          return json(502, { error: "Kestra detail payload is not a JSON object" });
        }

        const nextSchema = isPlainObject(detail.schema) ? detail.schema : {};
        const nextMarkdown = typeof detail.markdown === "string" ? detail.markdown : null;
        const nowIso = deps.nowIso();

        const { error: updateErr } = await supabaseAdmin
          .from("integration_catalog_items")
          .update({
            task_schema: nextSchema,
            task_markdown: nextMarkdown,
            source_updated_at: nowIso,
            last_synced_at: nowIso,
            updated_at: nowIso,
          })
          .eq("source", "kestra")
          .eq("external_id", taskClass);

        if (updateErr) return json(500, { error: `Failed to hydrate task detail: ${updateErr.message}` });

        return json(200, {
          ok: true,
          updated_target: "detail",
          external_id: taskClass,
        });
      }

      return json(400, { error: "Invalid target. Use target=sync_kestra or target=hydrate_detail" });
    }

    if (req.method === "PATCH" || req.method === "PUT") {
      const body = await req.json().catch(() => null);
      if (!isPlainObject(body)) {
        return json(400, { error: "Invalid JSON body" });
      }

      const target = typeof body.target === "string" ? body.target.trim() : "";
      if (target !== "item") {
        return json(400, { error: "Invalid target. Use target=item" });
      }

      const itemId = typeof body.item_id === "string" ? body.item_id.trim() : "";
      if (!itemId) return json(400, { error: "Missing item_id" });

      const update: Record<string, unknown> = {};

      if (body.enabled !== undefined) {
        if (typeof body.enabled !== "boolean") return json(400, { error: "enabled must be boolean" });
        update.enabled = body.enabled;
      }

      if (body.suggested_service_type !== undefined) {
        if (!(typeof body.suggested_service_type === "string" || body.suggested_service_type === null)) {
          return json(400, { error: "suggested_service_type must be a string or null" });
        }
        update.suggested_service_type = typeof body.suggested_service_type === "string"
          ? (body.suggested_service_type.trim() || null)
          : null;
      }

      if (body.mapping_notes !== undefined) {
        if (!(typeof body.mapping_notes === "string" || body.mapping_notes === null)) {
          return json(400, { error: "mapping_notes must be a string or null" });
        }
        update.mapping_notes = typeof body.mapping_notes === "string" ? body.mapping_notes : null;
      }

      if (body.mapped_service_id !== undefined) {
        if (!(typeof body.mapped_service_id === "string" || body.mapped_service_id === null)) {
          return json(400, { error: "mapped_service_id must be a string or null" });
        }
        update.mapped_service_id = typeof body.mapped_service_id === "string"
          ? (body.mapped_service_id.trim() || null)
          : null;
      }

      if (body.mapped_function_id !== undefined) {
        if (!(typeof body.mapped_function_id === "string" || body.mapped_function_id === null)) {
          return json(400, { error: "mapped_function_id must be a string or null" });
        }
        update.mapped_function_id = typeof body.mapped_function_id === "string"
          ? (body.mapped_function_id.trim() || null)
          : null;
      }

      if (Object.keys(update).length === 0) {
        return json(400, { error: "No updatable fields provided for item" });
      }

      update.updated_at = deps.nowIso();

      const { error: updateErr } = await supabaseAdmin
        .from("integration_catalog_items")
        .update(update)
        .eq("item_id", itemId);

      if (updateErr) return json(500, { error: `Failed to update catalog item: ${updateErr.message}` });

      return json(200, {
        ok: true,
        updated_target: "item",
        updated_id: itemId,
      });
    }

    return json(405, { error: "Method not allowed" });
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
  Deno.serve((req) => handleAdminIntegrationCatalogRequest(req));
}
