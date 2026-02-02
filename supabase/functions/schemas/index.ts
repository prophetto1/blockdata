import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { sha256HexOfString } from "../_shared/hash.ts";
import { createAdminClient, requireUserId } from "../_shared/supabase.ts";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function slugify(value: string): string {
  const s = (value || "").toLowerCase().trim();
  const cleaned = s
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+/, "")
    .replace(/_+$/, "")
    .replace(/_{2,}/g, "_");
  const out = cleaned.slice(0, 64);
  return out || "schema";
}

function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  const walk = (v: unknown): unknown => {
    if (v === null) return null;
    if (typeof v !== "object") return v;
    if (seen.has(v as object)) throw new Error("Schema JSON contains circular references");
    seen.add(v as object);
    if (Array.isArray(v)) return v.map(walk);
    const obj = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      out[key] = walk(obj[key]);
    }
    return out;
  };
  return JSON.stringify(walk(value));
}

function deriveSchemaRef(schema: Record<string, unknown>): string {
  const id = typeof schema["$id"] === "string" ? schema["$id"] : "";
  if (id) {
    const parts = id.split(/[:/]/).filter(Boolean);
    const tail = parts[parts.length - 1] || id;
    return slugify(tail);
  }
  const title = typeof schema["title"] === "string" ? schema["title"] : "";
  if (title) return slugify(title);
  return "schema";
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const ownerId = await requireUserId(req);
    const contentType = req.headers.get("content-type") || "";

    let schemaRefInput = "";
    let schemaJson: unknown;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const refRaw = form.get("schema_ref");
      schemaRefInput = typeof refRaw === "string" ? refRaw.trim() : "";
      const file = form.get("schema");
      if (!(file instanceof File)) return json(400, { error: "Missing schema file field `schema`" });
      const txt = await file.text();
      schemaJson = JSON.parse(txt);
    } else {
      const body = await req.json();
      if (isPlainObject(body) && "schema_json" in body) {
        schemaJson = (body as Record<string, unknown>)["schema_json"];
        schemaRefInput = typeof (body as Record<string, unknown>)["schema_ref"] === "string"
          ? String((body as Record<string, unknown>)["schema_ref"]).trim()
          : "";
      } else {
        schemaJson = body;
      }
    }

    if (!isPlainObject(schemaJson)) {
      return json(400, { error: "Schema must be a JSON object" });
    }

    const schema_ref = slugify(schemaRefInput || deriveSchemaRef(schemaJson));
    const schema_uid = await sha256HexOfString(stableStringify(schemaJson));

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from("schemas")
      .insert({
        owner_id: ownerId,
        schema_ref,
        schema_uid,
        schema_jsonb: schemaJson,
      })
      .select("schema_id, schema_ref, schema_uid, created_at")
      .single();

    if (error) {
      const msg = error.message || "Insert failed";
      const isDup = msg.toLowerCase().includes("duplicate");
      if (!isDup) return json(400, { error: msg });

      // Idempotency: if schema_ref already exists for this owner and schema_uid matches,
      // return the existing row (200). If the content differs, return 409 conflict.
      const { data: existing, error: selErr } = await supabaseAdmin
        .from("schemas")
        .select("schema_id, schema_ref, schema_uid, created_at")
        .eq("owner_id", ownerId)
        .eq("schema_ref", schema_ref)
        .maybeSingle();

      if (selErr) return json(500, { error: selErr.message });
      if (!existing) return json(409, { error: msg });

      if (existing.schema_uid === schema_uid) {
        return json(200, existing);
      }

      return json(409, {
        error:
          `schema_ref '${schema_ref}' already exists for this user with a different schema_uid`,
        existing: { schema_id: existing.schema_id, schema_uid: existing.schema_uid },
        incoming: { schema_uid },
      });
    }

    return json(200, data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(400, { error: msg });
  }
});
