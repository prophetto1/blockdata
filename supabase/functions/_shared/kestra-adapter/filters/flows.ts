// supabase/functions/_shared/kestra-adapter/filters/flows.ts

export type FlowSearchFilter = {
  page: number;
  size: number;
  sortBy: string;
  sortDir: "asc" | "desc";
  namespace?: string;
  q?: string;
};

const ALLOWED_SORT_COLUMNS = new Set(["id", "namespace", "updated"]);

export function parseFlowSearchParams(params: URLSearchParams): FlowSearchFilter {
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);
  const size = Math.min(100, Math.max(1, parseInt(params.get("size") ?? "25", 10) || 25));

  let sortBy = "id";
  let sortDir: "asc" | "desc" = "asc";
  const sortRaw = params.get("sort");
  if (sortRaw) {
    const [col, dir] = sortRaw.split(":");
    if (ALLOWED_SORT_COLUMNS.has(col)) sortBy = col;
    if (dir === "desc") sortDir = "desc";
  }

  const namespace = params.get("filters[namespace][PREFIX]") ?? undefined;
  const q = params.get("q") ?? undefined;

  return { page, size, sortBy, sortDir, namespace, q };
}
