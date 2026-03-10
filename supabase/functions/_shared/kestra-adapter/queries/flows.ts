// supabase/functions/_shared/kestra-adapter/queries/flows.ts
import type { KtRow } from "../../../../../kestra-ct/generated/database.types.ts";
import type { FlowSearchFilter } from "../filters/flows.ts";

type FlowRow = KtRow<"flows">;

export type FlowQueryResult = {
  rows: FlowRow[];
  total: number;
};

export async function queryFlows(
  supabase: { schema: (s: string) => any },
  filter: FlowSearchFilter,
): Promise<FlowQueryResult> {
  const from = (filter.page - 1) * filter.size;
  const to = from + filter.size - 1;

  let query = supabase
    .schema("kt")
    .from("flows")
    .select("*", { count: "exact" })
    .eq("deleted", false);

  if (filter.namespace) {
    query = query.ilike("namespace", `${filter.namespace}%`);
  }

  if (filter.q) {
    query = query.ilike("fulltext", `%${filter.q}%`);
  }

  query = query.order(filter.sortBy, { ascending: filter.sortDir === "asc" });
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) throw new Error(`kt.flows query failed: ${error.message}`);

  return {
    rows: (data ?? []) as FlowRow[],
    total: count ?? 0,
  };
}
