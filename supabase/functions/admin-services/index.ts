import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { requireSuperuser, type SuperuserContext } from "../_shared/superuser.ts";

type AdminServicesDeps = {
  requireSuperuser: (req: Request) => Promise<SuperuserContext>;
  createAdminClient: () => ReturnType<typeof createAdminClient>;
};

const defaultDeps: AdminServicesDeps = {
  requireSuperuser,
  createAdminClient,
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

function isHealthStatus(value: string): boolean {
  return value === "online" || value === "offline" || value === "degraded" || value === "unknown";
}

function isHttpMethod(value: string): boolean {
  return value === "GET" || value === "POST" || value === "PUT" || value === "DELETE";
}

function isFunctionType(value: string): boolean {
  return value === "source" ||
    value === "destination" ||
    value === "transform" ||
    value === "parse" ||
    value === "convert" ||
    value === "export" ||
    value === "test" ||
    value === "utility" ||
    value === "macro" ||
    value === "custom" ||
    value === "ingest" ||
    value === "callback";
}

function toSnakeCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function inferServiceTypeFromPluginType(pluginType: string): string {
  const value = pluginType.toLowerCase();
  if (value.includes(".dbt.")) return "dbt";
  if (value.includes(".docling.") || value.includes("document") || value.includes("parser")) return "docling";
  if (value.includes(".jdbc.") || value.includes(".sql.") || value.includes(".dlt.") || value.includes("sqlite")) return "dlt";
  if (value.includes("convert")) return "conversion";
  return "custom";
}

function inferFunctionTypeFromPluginType(pluginType: string): string {
  const value = pluginType.toLowerCase();
  if (value.includes(".dbt.")) return "transform";
  if (value.includes(".jdbc.") || value.includes(".sql.") || value.includes("trigger")) return "source";
  if (value.includes(".docling.") || value.includes("parse")) return "parse";
  if (value.includes("convert")) return "convert";
  return "utility";
}

function pluginTypeToLabel(pluginType: string): string {
  const segments = pluginType.split(".");
  return segments[segments.length - 1] ?? pluginType;
}

function pluginTypeToFunctionName(pluginType: string): string {
  const label = pluginTypeToLabel(pluginType);
  const snake = toSnakeCase(label);
  return snake.length > 0 ? snake : toSnakeCase(pluginType);
}

function pluginTypeToServiceName(serviceType: string): string {
  return `kestra-${serviceType}`;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function normalizePluginTypeInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const marker = "/plugins/";
  const markerIndex = trimmed.indexOf(marker);
  if (markerIndex >= 0) {
    const extracted = trimmed.slice(markerIndex + marker.length).replace(/\/+$/, "");
    return extracted.trim();
  }
  return trimmed;
}

export async function handleAdminServicesRequest(req: Request, deps: AdminServicesDeps = defaultDeps): Promise<Response> {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  try {
    const superuser = await deps.requireSuperuser(req);
    const supabaseAdmin = deps.createAdminClient();

    if (req.method === "GET") {
      const [{ data: services, error: servicesErr }, { data: functions, error: functionsErr }, {
        data: serviceTypes,
        error: serviceTypesErr,
      }] = await Promise.all([
        supabaseAdmin
          .from("service_registry")
          .select(
            "service_id,service_type,service_name,base_url,health_status,last_heartbeat,enabled,config,created_at,updated_at",
          ),
        supabaseAdmin
          .from("service_functions")
          .select(
            "function_id,service_id,function_name,function_type,label,description,entrypoint,http_method,parameter_schema,result_schema,enabled,tags,created_at,updated_at",
          ),
        supabaseAdmin
          .from("service_type_catalog")
          .select("service_type,label,description"),
      ]);

      if (servicesErr) return json(500, { error: `Failed to load services: ${servicesErr.message}` });
      if (functionsErr) return json(500, { error: `Failed to load functions: ${functionsErr.message}` });
      if (serviceTypesErr) return json(500, { error: `Failed to load service types: ${serviceTypesErr.message}` });

      const serviceRows = Array.isArray(services) ? [...services] : [];
      serviceRows.sort((a, b) => {
        const ta = String(a.service_type ?? "");
        const tb = String(b.service_type ?? "");
        if (ta !== tb) return ta.localeCompare(tb);
        return String(a.service_name ?? "").localeCompare(String(b.service_name ?? ""));
      });

      const functionRows = Array.isArray(functions) ? [...functions] : [];
      functionRows.sort((a, b) => {
        const sa = String(a.service_id ?? "");
        const sb = String(b.service_id ?? "");
        if (sa !== sb) return sa.localeCompare(sb);
        return String(a.function_name ?? "").localeCompare(String(b.function_name ?? ""));
      });

      const serviceTypeRows = Array.isArray(serviceTypes) ? [...serviceTypes] : [];
      serviceTypeRows.sort((a, b) => String(a.service_type ?? "").localeCompare(String(b.service_type ?? "")));

      return json(200, {
        superuser: {
          user_id: superuser.userId,
          email: superuser.email,
        },
        service_types: serviceTypeRows,
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

      if (target === "import_registry") {
        const importMode = typeof body.import_mode === "string" && body.import_mode === "insert" ? "insert" : "upsert";
        const defaultBaseUrl = typeof body.default_base_url === "string" && body.default_base_url.trim().length > 0
          ? body.default_base_url.trim()
          : "http://localhost:8080";
        const rawServices = Array.isArray(body.services) ? body.services : [];
        const rawFunctions = Array.isArray(body.functions) ? body.functions : [];
        const rawPlugins = Array.isArray(body.plugins)
          ? body.plugins
          : (Array.isArray(body.plugin_types) ? body.plugin_types : []);

        const { data: serviceTypesRows, error: serviceTypesErr } = await supabaseAdmin
          .from("service_type_catalog")
          .select("service_type");
        if (serviceTypesErr) {
          return json(500, { error: `Failed to load service types: ${serviceTypesErr.message}` });
        }
        const knownServiceTypes = new Set(
          (Array.isArray(serviceTypesRows) ? serviceTypesRows : [])
            .map((row) => String((row as { service_type?: unknown }).service_type ?? "").trim())
            .filter((value) => value.length > 0),
        );

        const hasCustomServiceType = knownServiceTypes.has("custom");
        const normalizeServiceType = (value: string): string => {
          if (knownServiceTypes.has(value)) return value;
          if (hasCustomServiceType) return "custom";
          return value;
        };

        type ServiceImportRow = {
          service_type: string;
          service_name: string;
          base_url: string;
          health_status: string;
          enabled: boolean;
          config: Record<string, unknown>;
        };

        type FunctionImportRow = {
          service_id?: string;
          service_type?: string;
          service_name?: string;
          function_name: string;
          function_type: string;
          label: string;
          description: string | null;
          entrypoint: string;
          http_method: string;
          enabled: boolean;
          tags: string[];
        };

        const errors: string[] = [];
        const serviceRowsByKey = new Map<string, ServiceImportRow>();
        const functionsNormalized: FunctionImportRow[] = [];

        for (const item of rawServices) {
          if (!isPlainObject(item)) {
            errors.push("services[] item must be an object.");
            continue;
          }
          const inputServiceType = typeof item.service_type === "string" ? item.service_type.trim() : "";
          const serviceType = normalizeServiceType(inputServiceType);
          const serviceName = typeof item.service_name === "string" ? item.service_name.trim() : "";
          const baseUrl = typeof item.base_url === "string" && item.base_url.trim().length > 0
            ? item.base_url.trim()
            : defaultBaseUrl;
          const healthStatus = typeof item.health_status === "string" && isHealthStatus(item.health_status)
            ? item.health_status
            : "unknown";
          const enabled = item.enabled === undefined ? true : item.enabled;
          const config = isPlainObject(item.config) ? item.config : {};

          if (!serviceType || !serviceName) {
            errors.push("services[] requires service_type and service_name.");
            continue;
          }
          if (typeof enabled !== "boolean") {
            errors.push(`services[] ${serviceType}/${serviceName}: enabled must be boolean.`);
            continue;
          }

          const key = `${serviceType}::${serviceName}`;
          serviceRowsByKey.set(key, {
            service_type: serviceType,
            service_name: serviceName,
            base_url: baseUrl,
            health_status: healthStatus,
            enabled,
            config,
          });
        }

        for (const item of rawPlugins) {
          let pluginType = "";
          let pluginMeta: Record<string, unknown> = {};
          if (typeof item === "string") {
            pluginType = item.trim();
          } else if (isPlainObject(item)) {
            pluginMeta = item;
            pluginType = typeof item.type === "string" ? item.type.trim() : "";
          }

          if (!pluginType) {
            errors.push("plugins[] item requires type.");
            continue;
          }

          const inferredServiceType = normalizeServiceType(
            typeof pluginMeta.service_type === "string" && pluginMeta.service_type.trim().length > 0
              ? pluginMeta.service_type.trim()
              : inferServiceTypeFromPluginType(pluginType),
          );
          const inferredServiceName = typeof pluginMeta.service_name === "string" && pluginMeta.service_name.trim().length > 0
            ? pluginMeta.service_name.trim()
            : pluginTypeToServiceName(inferredServiceType);
          const baseUrl = typeof pluginMeta.base_url === "string" && pluginMeta.base_url.trim().length > 0
            ? pluginMeta.base_url.trim()
            : defaultBaseUrl;
          const enabled = pluginMeta.enabled === undefined ? true : pluginMeta.enabled;
          if (typeof enabled !== "boolean") {
            errors.push(`plugins[] ${pluginType}: enabled must be boolean.`);
            continue;
          }

          const pluginConfig = isPlainObject(pluginMeta.config) ? pluginMeta.config : {};
          const key = `${inferredServiceType}::${inferredServiceName}`;
          const existingService = serviceRowsByKey.get(key);
          serviceRowsByKey.set(key, {
            service_type: inferredServiceType,
            service_name: inferredServiceName,
            base_url: existingService?.base_url ?? baseUrl,
            health_status: existingService?.health_status ?? "unknown",
            enabled: existingService?.enabled ?? enabled,
            config: {
              ...(existingService?.config ?? {}),
              ...pluginConfig,
            },
          });

          const label = typeof pluginMeta.label === "string" && pluginMeta.label.trim().length > 0
            ? pluginMeta.label.trim()
            : pluginTypeToLabel(pluginType);
          const functionName = typeof pluginMeta.function_name === "string" && pluginMeta.function_name.trim().length > 0
            ? pluginMeta.function_name.trim()
            : pluginTypeToFunctionName(pluginType);
          const functionTypeRaw = typeof pluginMeta.function_type === "string" && pluginMeta.function_type.trim().length > 0
            ? pluginMeta.function_type.trim()
            : inferFunctionTypeFromPluginType(pluginType);
          const functionType = isFunctionType(functionTypeRaw) ? functionTypeRaw : "utility";
          const entrypoint = typeof pluginMeta.entrypoint === "string" && pluginMeta.entrypoint.trim().length > 0
            ? pluginMeta.entrypoint.trim()
            : pluginType;
          const httpMethodRaw = typeof pluginMeta.http_method === "string" ? pluginMeta.http_method.trim().toUpperCase() : "POST";
          const httpMethod = isHttpMethod(httpMethodRaw) ? httpMethodRaw : "POST";
          const description = typeof pluginMeta.description === "string" && pluginMeta.description.trim().length > 0
            ? pluginMeta.description.trim()
            : null;
          const tags = isStringArray(pluginMeta.tags) ? pluginMeta.tags : ["kestra", inferredServiceType];

          functionsNormalized.push({
            service_type: inferredServiceType,
            service_name: inferredServiceName,
            function_name: functionName,
            function_type: functionType,
            label,
            description,
            entrypoint,
            http_method: httpMethod,
            enabled,
            tags,
          });
        }

        for (const item of rawFunctions) {
          if (!isPlainObject(item)) {
            errors.push("functions[] item must be an object.");
            continue;
          }
          const functionName = typeof item.function_name === "string" ? item.function_name.trim() : "";
          const label = typeof item.label === "string" ? item.label.trim() : "";
          const entrypoint = typeof item.entrypoint === "string" ? item.entrypoint.trim() : "";
          const functionTypeRaw = typeof item.function_type === "string" ? item.function_type.trim() : "";
          const functionType = isFunctionType(functionTypeRaw) ? functionTypeRaw : "";
          const httpMethodRaw = typeof item.http_method === "string" ? item.http_method.trim().toUpperCase() : "POST";
          const httpMethod = isHttpMethod(httpMethodRaw) ? httpMethodRaw : "POST";
          const description = typeof item.description === "string"
            ? item.description
            : (item.description === null ? null : null);
          const enabled = item.enabled === undefined ? true : item.enabled;
          const tags = isStringArray(item.tags) ? item.tags : [];
          const serviceId = typeof item.service_id === "string" && item.service_id.trim().length > 0 ? item.service_id.trim() : undefined;
          const serviceType = typeof item.service_type === "string" && item.service_type.trim().length > 0
            ? normalizeServiceType(item.service_type.trim())
            : undefined;
          const serviceName = typeof item.service_name === "string" && item.service_name.trim().length > 0
            ? item.service_name.trim()
            : undefined;

          if (!functionName || !label || !entrypoint || !functionType) {
            errors.push("functions[] requires function_name, function_type, label, and entrypoint.");
            continue;
          }
          if (typeof enabled !== "boolean") {
            errors.push(`functions[] ${functionName}: enabled must be boolean.`);
            continue;
          }
          if (!serviceId && !(serviceType && serviceName)) {
            errors.push(`functions[] ${functionName}: provide service_id or (service_type + service_name).`);
            continue;
          }

          if (serviceType && serviceName) {
            const key = `${serviceType}::${serviceName}`;
            if (!serviceRowsByKey.has(key)) {
              serviceRowsByKey.set(key, {
                service_type: serviceType,
                service_name: serviceName,
                base_url: defaultBaseUrl,
                health_status: "unknown",
                enabled: true,
                config: {},
              });
            }
          }

          functionsNormalized.push({
            service_id: serviceId,
            service_type: serviceType,
            service_name: serviceName,
            function_name: functionName,
            function_type: functionType,
            label: label,
            description,
            entrypoint,
            http_method: httpMethod,
            enabled,
            tags,
          });
        }

        const serviceRows = [...serviceRowsByKey.values()];
        let serviceIdByKey = new Map<string, string>();

        if (serviceRows.length > 0) {
          if (importMode === "upsert") {
            const { data: upserted, error: serviceUpsertErr } = await supabaseAdmin
              .from("service_registry")
              .upsert(serviceRows, { onConflict: "service_type,service_name" })
              .select("service_id,service_type,service_name");
            if (serviceUpsertErr) {
              return json(500, { error: `Failed to import services: ${serviceUpsertErr.message}` });
            }
            const rows = Array.isArray(upserted) ? upserted : [];
            serviceIdByKey = new Map(
              rows.map((row) => [
                `${String((row as { service_type?: unknown }).service_type ?? "")}::${String((row as { service_name?: unknown }).service_name ?? "")}`,
                String((row as { service_id?: unknown }).service_id ?? ""),
              ]),
            );
          } else {
            const { data: inserted, error: serviceInsertErr } = await supabaseAdmin
              .from("service_registry")
              .insert(serviceRows)
              .select("service_id,service_type,service_name");
            if (serviceInsertErr) {
              return json(500, { error: `Failed to import services: ${serviceInsertErr.message}` });
            }
            const rows = Array.isArray(inserted) ? inserted : [];
            serviceIdByKey = new Map(
              rows.map((row) => [
                `${String((row as { service_type?: unknown }).service_type ?? "")}::${String((row as { service_name?: unknown }).service_name ?? "")}`,
                String((row as { service_id?: unknown }).service_id ?? ""),
              ]),
            );
          }
        }

        const functionRowsResolved: Record<string, unknown>[] = [];
        for (const row of functionsNormalized) {
          let serviceId = row.service_id ?? "";
          if (!serviceId && row.service_type && row.service_name) {
            serviceId = serviceIdByKey.get(`${row.service_type}::${row.service_name}`) ?? "";
          }
          if (!serviceId) {
            errors.push(`Unable to resolve service for function ${row.function_name}.`);
            continue;
          }
          functionRowsResolved.push({
            service_id: serviceId,
            function_name: row.function_name,
            function_type: row.function_type,
            label: row.label,
            description: row.description,
            entrypoint: row.entrypoint,
            http_method: row.http_method,
            enabled: row.enabled,
            tags: row.tags,
          });
        }

        if (functionRowsResolved.length > 0) {
          if (importMode === "upsert") {
            const { error: functionUpsertErr } = await supabaseAdmin
              .from("service_functions")
              .upsert(functionRowsResolved, { onConflict: "service_id,function_name" });
            if (functionUpsertErr) {
              return json(500, { error: `Failed to import functions: ${functionUpsertErr.message}` });
            }
          } else {
            const { error: functionInsertErr } = await supabaseAdmin
              .from("service_functions")
              .insert(functionRowsResolved);
            if (functionInsertErr) {
              return json(500, { error: `Failed to import functions: ${functionInsertErr.message}` });
            }
          }
        }

        return json(200, {
          ok: true,
          imported: {
            services: serviceRows.length,
            functions: functionRowsResolved.length,
          },
          warnings: errors,
          mode: importMode,
        });
      }

      if (target === "service") {
        const serviceType = typeof body.service_type === "string" ? body.service_type.trim() : "";
        const serviceName = typeof body.service_name === "string" ? body.service_name.trim() : "";
        const baseUrl = typeof body.base_url === "string" ? body.base_url.trim() : "";
        const healthStatus = typeof body.health_status === "string" ? body.health_status.trim() : "unknown";
        const enabled = body.enabled === undefined ? true : body.enabled;
        const config = body.config === undefined ? {} : body.config;

        if (!serviceType) return json(400, { error: "Missing service_type" });
        if (!serviceName) return json(400, { error: "Missing service_name" });
        if (!baseUrl) return json(400, { error: "Missing base_url" });
        if (!isHealthStatus(healthStatus)) {
          return json(400, { error: "health_status must be one of: online, offline, degraded, unknown" });
        }
        if (typeof enabled !== "boolean") return json(400, { error: "enabled must be boolean" });
        if (!isPlainObject(config)) return json(400, { error: "config must be an object" });

        const { data, error: insertErr } = await supabaseAdmin
          .from("service_registry")
          .insert({
            service_type: serviceType,
            service_name: serviceName,
            base_url: baseUrl,
            health_status: healthStatus,
            enabled,
            config,
          })
          .select("service_id")
          .single();

        if (insertErr) return json(500, { error: `Failed to create service: ${insertErr.message}` });

        return json(200, {
          ok: true,
          created_target: "service",
          created_id: data?.service_id ?? null,
        });
      }

      if (target === "function") {
        const serviceId = typeof body.service_id === "string" ? body.service_id.trim() : "";
        const functionName = typeof body.function_name === "string" ? body.function_name.trim() : "";
        const functionType = typeof body.function_type === "string" ? body.function_type.trim() : "";
        const label = typeof body.label === "string" ? body.label.trim() : "";
        const entrypoint = typeof body.entrypoint === "string" ? body.entrypoint.trim() : "";
        const httpMethod = typeof body.http_method === "string" ? body.http_method.trim() : "POST";
        const description = body.description === undefined ? null : body.description;
        const enabled = body.enabled === undefined ? true : body.enabled;
        const tags = body.tags === undefined ? [] : body.tags;

        if (!serviceId) return json(400, { error: "Missing service_id" });
        if (!functionName) return json(400, { error: "Missing function_name" });
        if (!functionType || !isFunctionType(functionType)) {
          return json(
            400,
            { error: "function_type must be one of: source, destination, transform, parse, convert, export, test, utility, macro, custom, ingest, callback" },
          );
        }
        if (!label) return json(400, { error: "Missing label" });
        if (!entrypoint) return json(400, { error: "Missing entrypoint" });
        if (!isHttpMethod(httpMethod)) return json(400, { error: "http_method must be one of: GET, POST, PUT, DELETE" });
        if (!(typeof description === "string" || description === null)) {
          return json(400, { error: "description must be a string or null" });
        }
        if (typeof enabled !== "boolean") return json(400, { error: "enabled must be boolean" });
        if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== "string")) {
          return json(400, { error: "tags must be an array of strings" });
        }

        const parameterSchema = body.parameter_schema === undefined ? [] : body.parameter_schema;
        if (!Array.isArray(parameterSchema)) {
          return json(400, { error: "parameter_schema must be an array" });
        }

        const resultSchema = body.result_schema === undefined ? null : body.result_schema;
        if (resultSchema !== null && !isPlainObject(resultSchema)) {
          return json(400, { error: "result_schema must be an object or null" });
        }

        const { data, error: insertErr } = await supabaseAdmin
          .from("service_functions")
          .insert({
            service_id: serviceId,
            function_name: functionName,
            function_type: functionType,
            label,
            description,
            entrypoint,
            http_method: httpMethod,
            parameter_schema: parameterSchema,
            result_schema: resultSchema,
            enabled,
            tags,
          })
          .select("function_id")
          .single();

        if (insertErr) return json(500, { error: `Failed to create function: ${insertErr.message}` });

        return json(200, {
          ok: true,
          created_target: "function",
          created_id: data?.function_id ?? null,
        });
      }

      return json(400, { error: "Invalid target. Use target=service or target=function" });
    }

    if (req.method === "PATCH" || req.method === "PUT") {
      const body = await req.json().catch(() => null);
      if (!isPlainObject(body)) {
        return json(400, { error: "Invalid JSON body" });
      }

      const target = typeof body.target === "string" ? body.target.trim() : "";

      if (target === "service") {
        const serviceId = typeof body.service_id === "string" ? body.service_id.trim() : "";
        if (!serviceId) return json(400, { error: "Missing service_id" });

        const update: Record<string, unknown> = {};

        if (body.enabled !== undefined) {
          if (typeof body.enabled !== "boolean") return json(400, { error: "enabled must be boolean" });
          update.enabled = body.enabled;
        }

        if (body.base_url !== undefined) {
          if (typeof body.base_url !== "string" || body.base_url.trim().length === 0) {
            return json(400, { error: "base_url must be a non-empty string" });
          }
          update.base_url = body.base_url.trim();
        }

        if (body.service_name !== undefined) {
          if (typeof body.service_name !== "string" || body.service_name.trim().length === 0) {
            return json(400, { error: "service_name must be a non-empty string" });
          }
          update.service_name = body.service_name.trim();
        }

        if (body.service_type !== undefined) {
          if (typeof body.service_type !== "string" || body.service_type.trim().length === 0) {
            return json(400, { error: "service_type must be a non-empty string" });
          }
          update.service_type = body.service_type.trim();
        }

        if (body.health_status !== undefined) {
          if (typeof body.health_status !== "string" || !isHealthStatus(body.health_status)) {
            return json(400, { error: "health_status must be one of: online, offline, degraded, unknown" });
          }
          update.health_status = body.health_status;
        }

        if (body.config !== undefined) {
          if (!isPlainObject(body.config)) return json(400, { error: "config must be an object" });
          update.config = body.config;
        }

        if (Object.keys(update).length === 0) {
          return json(400, { error: "No updatable fields provided for service" });
        }

        update.updated_at = new Date().toISOString();

        const { error: updateErr } = await supabaseAdmin
          .from("service_registry")
          .update(update)
          .eq("service_id", serviceId);

        if (updateErr) return json(500, { error: `Failed to update service: ${updateErr.message}` });

        return json(200, {
          ok: true,
          updated_target: "service",
          updated_id: serviceId,
        });
      }

      if (target === "function") {
        const functionId = typeof body.function_id === "string" ? body.function_id.trim() : "";
        if (!functionId) return json(400, { error: "Missing function_id" });

        const update: Record<string, unknown> = {};

        if (body.enabled !== undefined) {
          if (typeof body.enabled !== "boolean") return json(400, { error: "enabled must be boolean" });
          update.enabled = body.enabled;
        }

        if (body.entrypoint !== undefined) {
          if (typeof body.entrypoint !== "string" || body.entrypoint.trim().length === 0) {
            return json(400, { error: "entrypoint must be a non-empty string" });
          }
          update.entrypoint = body.entrypoint.trim();
        }

        if (body.function_name !== undefined) {
          if (typeof body.function_name !== "string" || body.function_name.trim().length === 0) {
            return json(400, { error: "function_name must be a non-empty string" });
          }
          update.function_name = body.function_name.trim();
        }

        if (body.function_type !== undefined) {
          if (typeof body.function_type !== "string" || !isFunctionType(body.function_type)) {
            return json(
              400,
              { error: "function_type must be one of: source, destination, transform, parse, convert, export, test, utility, macro, custom, ingest, callback" },
            );
          }
          update.function_type = body.function_type;
        }

        if (body.http_method !== undefined) {
          if (typeof body.http_method !== "string" || !isHttpMethod(body.http_method)) {
            return json(400, { error: "http_method must be one of: GET, POST, PUT, DELETE" });
          }
          update.http_method = body.http_method;
        }

        if (body.label !== undefined) {
          if (typeof body.label !== "string" || body.label.trim().length === 0) {
            return json(400, { error: "label must be a non-empty string" });
          }
          update.label = body.label.trim();
        }

        if (body.description !== undefined) {
          if (!(typeof body.description === "string" || body.description === null)) {
            return json(400, { error: "description must be a string or null" });
          }
          update.description = body.description;
        }

        if (body.tags !== undefined) {
          if (!Array.isArray(body.tags) || body.tags.some((tag) => typeof tag !== "string")) {
            return json(400, { error: "tags must be an array of strings" });
          }
          update.tags = body.tags;
        }

        if (body.parameter_schema !== undefined) {
          if (!Array.isArray(body.parameter_schema)) {
            return json(400, { error: "parameter_schema must be an array" });
          }
          update.parameter_schema = body.parameter_schema;
        }

        if (body.result_schema !== undefined) {
          if (body.result_schema !== null && !isPlainObject(body.result_schema)) {
            return json(400, { error: "result_schema must be an object or null" });
          }
          update.result_schema = body.result_schema;
        }

        if (Object.keys(update).length === 0) {
          return json(400, { error: "No updatable fields provided for function" });
        }

        update.updated_at = new Date().toISOString();

        const { error: updateErr } = await supabaseAdmin
          .from("service_functions")
          .update(update)
          .eq("function_id", functionId);

        if (updateErr) return json(500, { error: `Failed to update function: ${updateErr.message}` });

        return json(200, {
          ok: true,
          updated_target: "function",
          updated_id: functionId,
        });
      }

      return json(400, { error: "Invalid target. Use target=service or target=function" });
    }

    if (req.method === "DELETE") {
      const body = await req.json().catch(() => null);
      if (!isPlainObject(body)) {
        return json(400, { error: "Invalid JSON body" });
      }

      const target = typeof body.target === "string" ? body.target.trim() : "";

      if (target === "service") {
        const serviceId = typeof body.service_id === "string" ? body.service_id.trim() : "";
        if (!serviceId) return json(400, { error: "Missing service_id" });

        const { error: deleteErr } = await supabaseAdmin
          .from("service_registry")
          .delete()
          .eq("service_id", serviceId);
        if (deleteErr) return json(500, { error: `Failed to delete service: ${deleteErr.message}` });

        return json(200, {
          ok: true,
          deleted_target: "service",
          deleted_id: serviceId,
        });
      }

      if (target === "function") {
        const functionId = typeof body.function_id === "string" ? body.function_id.trim() : "";
        if (!functionId) return json(400, { error: "Missing function_id" });

        const { error: deleteErr } = await supabaseAdmin
          .from("service_functions")
          .delete()
          .eq("function_id", functionId);
        if (deleteErr) return json(500, { error: `Failed to delete function: ${deleteErr.message}` });

        return json(200, {
          ok: true,
          deleted_target: "function",
          deleted_id: functionId,
        });
      }

      return json(400, { error: "Invalid target. Use target=service or target=function" });
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
  Deno.serve((req) => handleAdminServicesRequest(req));
}
