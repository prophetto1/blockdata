// supabase/functions/kestra-flows/index.ts
import { corsPreflight } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { parseFlowSearchParams } from "../_shared/kestra-adapter/filters/flows.ts";
import { queryFlows } from "../_shared/kestra-adapter/queries/flows.ts";
import { mapFlowRow } from "../_shared/kestra-adapter/mappers/flows.ts";
import { jsonResponse, errorResponse } from "../_shared/kestra-adapter/http/response.ts";

export async function handleFlowsRequest(
  req: Request,
  supabase: { schema: (s: string) => any },
): Promise<Response> {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "GET") return errorResponse(405, "Method not allowed");

  try {
    const url = new URL(req.url);
    const filter = parseFlowSearchParams(url.searchParams);
    const { rows, total } = await queryFlows(supabase, filter);
    const results = rows.map(mapFlowRow);

    return jsonResponse(200, { results, total });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return errorResponse(500, message);
  }
}

Deno.serve(async (req: Request) => {
  const supabase = createAdminClient();
  return handleFlowsRequest(req, supabase);
});