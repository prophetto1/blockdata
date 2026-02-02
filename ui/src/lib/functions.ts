import { supabase } from "@/lib/supabase";
import { requirePublicEnv } from "@/lib/env";

type Json = Record<string, unknown>;

async function getAuthHeaders(): Promise<{ apikey: string; authorization: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  const apikey = requirePublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return { apikey, authorization: `Bearer ${token}` };
}

export async function ingestDocument(args: {
  file: File;
  immutable_schema_ref: string;
  doc_title: string;
}): Promise<{ source_uid: string; doc_uid: string | null; status: string; blocks_count?: number }> {
  const base = requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL");
  const { apikey, authorization } = await getAuthHeaders();

  const form = new FormData();
  form.append("file", args.file);
  form.append("immutable_schema_ref", args.immutable_schema_ref);
  form.append("doc_title", args.doc_title);

  const res = await fetch(`${base}/functions/v1/ingest`, {
    method: "POST",
    headers: { apikey, Authorization: authorization },
    body: form
  });

  const txt = await res.text();
  const data = JSON.parse(txt) as Json;
  if (!res.ok) throw new Error(String(data.error || txt));
  return data as any;
}

export async function uploadSchema(args: {
  schemaFile: File;
  schema_ref?: string;
}): Promise<{ schema_id: string; schema_ref: string; schema_uid: string }> {
  const base = requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL");
  const { apikey, authorization } = await getAuthHeaders();

  const form = new FormData();
  form.append("schema", args.schemaFile);
  if (args.schema_ref) form.append("schema_ref", args.schema_ref);

  const res = await fetch(`${base}/functions/v1/schemas`, {
    method: "POST",
    headers: { apikey, Authorization: authorization },
    body: form
  });

  const txt = await res.text();
  const data = JSON.parse(txt) as Json;
  if (!res.ok) throw new Error(String(data.error || txt));
  if (!data.schema_id) throw new Error("Schema upload returned no schema_id");
  return data as any;
}

export async function createRun(args: { doc_uid: string; schema_id: string }): Promise<{ run_id: string; total_blocks: number }> {
  const base = requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL");
  const { apikey, authorization } = await getAuthHeaders();

  const res = await fetch(`${base}/functions/v1/runs`, {
    method: "POST",
    headers: { apikey, Authorization: authorization, "Content-Type": "application/json" },
    body: JSON.stringify({ doc_uid: args.doc_uid, schema_id: args.schema_id })
  });

  const txt = await res.text();
  const data = JSON.parse(txt) as Json;
  if (!res.ok) throw new Error(String(data.error || txt));
  if (!data.run_id) throw new Error("Run creation returned no run_id");
  return data as any;
}

export async function downloadExportJsonl(args: { doc_uid?: string; run_id?: string }): Promise<void> {
  const base = requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL");
  const { apikey, authorization } = await getAuthHeaders();

  const qs = args.run_id
    ? `run_id=${encodeURIComponent(args.run_id)}`
    : `doc_uid=${encodeURIComponent(args.doc_uid || "")}`;

  const res = await fetch(`${base}/functions/v1/export-jsonl?${qs}`, {
    method: "GET",
    headers: { apikey, Authorization: authorization }
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `export-${args.run_id || args.doc_uid}.jsonl`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

