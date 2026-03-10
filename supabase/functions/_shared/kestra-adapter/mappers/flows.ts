import type { KtRow } from "../../../../../kestra-ct/generated/database.types.ts";
import type { Json } from "../../../../../kestra-ct/generated/database.types.ts";

/** Shape returned to the Kestra frontend. Matches the contract Flow type. */
export type FlowDto = {
  id: string;
  namespace: string;
  revision: number;
  description?: string;
  disabled: boolean;
  deleted: boolean;
  labels?: Record<string, string>;
  triggers?: Array<{ id: string; type: string; [k: string]: unknown }>;
  inputs?: Array<{ id: string; type: string; [k: string]: unknown }>;
  tasks?: Array<{ id: string; type: string; [k: string]: unknown }>;
  source?: string;
  updated?: string;
};

type FlowRow = KtRow<"flows">;

function jsonObj(v: Json | undefined): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v))
    return v as Record<string, unknown>;
  return {};
}

export function mapFlowRow(row: FlowRow): FlowDto {
  const val = jsonObj(row.value);

  return {
    id: row.id,
    namespace: row.namespace,
    revision: row.revision,
    description:
      typeof val.description === "string" ? val.description : undefined,
    disabled: val.disabled === true,
    deleted: row.deleted,
    labels: isStringRecord(val.labels) ? val.labels : undefined,
    triggers: Array.isArray(val.triggers)
      ? (val.triggers as FlowDto["triggers"])
      : undefined,
    inputs: Array.isArray(val.inputs)
      ? (val.inputs as FlowDto["inputs"])
      : undefined,
    tasks: Array.isArray(val.tasks)
      ? (val.tasks as FlowDto["tasks"])
      : undefined,
    source: row.source_code,
    updated: row.updated ?? undefined,
  };
}

function isStringRecord(v: unknown): v is Record<string, string> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
