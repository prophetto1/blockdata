import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type RuntimePolicy = {
  models: {
    platform_default_model: string;
    platform_default_temperature: number;
    platform_default_max_tokens: number;
  };
  worker: {
    max_retries: number;
    claim_batch_size: {
      default: number;
      min: number;
      max: number;
    };
    prompt_caching: {
      enabled: boolean;
    };
    batching: {
      enabled: boolean;
      pack_size: number;
      pack_size_max: number;
      text_heavy_max_pack_size: number;
      context_window_tokens: number;
      output_reserve_tokens: number;
      tool_overhead_tokens: number;
      max_output_tokens: number;
      per_block_output_tokens: number;
    };
  };
  upload: {
    max_files_per_batch: number;
    allowed_extensions: string[];
  };
};

export type RuntimePolicySnapshot = {
  snapshot_at: string;
  source: "admin_runtime_policy";
  models: RuntimePolicy["models"];
  worker: RuntimePolicy["worker"];
  upload: RuntimePolicy["upload"];
};

export type AdminPolicyRow = {
  policy_key: string;
  value_jsonb: unknown;
  value_type: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
};

const DEFAULT_POLICY: RuntimePolicy = {
  models: {
    platform_default_model: "claude-sonnet-4-5-20250929",
    platform_default_temperature: 0.3,
    platform_default_max_tokens: 2000,
  },
  worker: {
    max_retries: 3,
    claim_batch_size: {
      default: 25,
      min: 1,
      max: 100,
    },
    prompt_caching: {
      enabled: true,
    },
    batching: {
      enabled: true,
      pack_size: 10,
      pack_size_max: 40,
      text_heavy_max_pack_size: 6,
      context_window_tokens: 200000,
      output_reserve_tokens: 20000,
      tool_overhead_tokens: 2000,
      max_output_tokens: 8192,
      per_block_output_tokens: 200,
    },
  },
  upload: {
    max_files_per_batch: 25,
    allowed_extensions: [
      "md",
      "markdown",
      "docx",
      "pdf",
      "pptx",
      "xlsx",
      "html",
      "htm",
      "csv",
      "txt",
    ],
  },
};

function deepCopyPolicy(policy: RuntimePolicy): RuntimePolicy {
  return JSON.parse(JSON.stringify(policy)) as RuntimePolicy;
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function asFiniteInteger(value: unknown): number | null {
  const n = asFiniteNumber(value);
  if (n === null || !Number.isInteger(n)) return null;
  return n;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const out: string[] = [];
  for (const v of value) {
    const s = asString(v);
    if (!s) return null;
    out.push(s.toLowerCase());
  }
  return out;
}

export function applyPolicyValue(
  policy: RuntimePolicy,
  key: string,
  value: unknown,
): boolean {
  if (key === "models.platform_default_model") {
    const parsed = asString(value);
    if (!parsed) return false;
    policy.models.platform_default_model = parsed;
    return true;
  }
  if (key === "models.platform_default_temperature") {
    const parsed = asFiniteNumber(value);
    if (parsed === null) return false;
    policy.models.platform_default_temperature = parsed;
    return true;
  }
  if (key === "models.platform_default_max_tokens") {
    const parsed = asFiniteInteger(value);
    if (parsed === null) return false;
    policy.models.platform_default_max_tokens = parsed;
    return true;
  }
  if (key === "worker.max_retries") {
    const parsed = asFiniteInteger(value);
    if (parsed === null) return false;
    policy.worker.max_retries = parsed;
    return true;
  }
  if (key === "worker.claim_batch_size.default") {
    const parsed = asFiniteInteger(value);
    if (parsed === null) return false;
    policy.worker.claim_batch_size.default = parsed;
    return true;
  }
  if (key === "worker.claim_batch_size.min") {
    const parsed = asFiniteInteger(value);
    if (parsed === null) return false;
    policy.worker.claim_batch_size.min = parsed;
    return true;
  }
  if (key === "worker.claim_batch_size.max") {
    const parsed = asFiniteInteger(value);
    if (parsed === null) return false;
    policy.worker.claim_batch_size.max = parsed;
    return true;
  }
  if (key === "worker.prompt_caching.enabled") {
    const parsed = asBoolean(value);
    if (parsed === null) return false;
    policy.worker.prompt_caching.enabled = parsed;
    return true;
  }
  if (key === "worker.batching.enabled") {
    const parsed = asBoolean(value);
    if (parsed === null) return false;
    policy.worker.batching.enabled = parsed;
    return true;
  }
  if (key === "worker.batching.pack_size") {
    const parsed = asFiniteInteger(value);
    if (parsed === null) return false;
    policy.worker.batching.pack_size = parsed;
    return true;
  }
  if (key === "worker.batching.pack_size_max") {
    const parsed = asFiniteInteger(value);
    if (parsed === null) return false;
    policy.worker.batching.pack_size_max = parsed;
    return true;
  }
  if (key === "worker.batching.text_heavy_max_pack_size") {
    const parsed = asFiniteInteger(value);
    if (parsed === null) return false;
    policy.worker.batching.text_heavy_max_pack_size = parsed;
    return true;
  }
  if (key === "worker.batching.context_window_tokens") {
    const parsed = asFiniteInteger(value);
    if (parsed === null) return false;
    policy.worker.batching.context_window_tokens = parsed;
    return true;
  }
  if (key === "worker.batching.output_reserve_tokens") {
    const parsed = asFiniteInteger(value);
    if (parsed === null) return false;
    policy.worker.batching.output_reserve_tokens = parsed;
    return true;
  }
  if (key === "worker.batching.tool_overhead_tokens") {
    const parsed = asFiniteInteger(value);
    if (parsed === null) return false;
    policy.worker.batching.tool_overhead_tokens = parsed;
    return true;
  }
  if (key === "worker.batching.max_output_tokens") {
    const parsed = asFiniteInteger(value);
    if (parsed === null) return false;
    policy.worker.batching.max_output_tokens = parsed;
    return true;
  }
  if (key === "worker.batching.per_block_output_tokens") {
    const parsed = asFiniteInteger(value);
    if (parsed === null) return false;
    policy.worker.batching.per_block_output_tokens = parsed;
    return true;
  }
  if (key === "upload.max_files_per_batch") {
    const parsed = asFiniteInteger(value);
    if (parsed === null) return false;
    policy.upload.max_files_per_batch = parsed;
    return true;
  }
  if (key === "upload.allowed_extensions") {
    const parsed = asStringArray(value);
    if (!parsed || parsed.length === 0) return false;
    policy.upload.allowed_extensions = parsed;
    return true;
  }
  return false;
}

function applyPolicyRow(policy: RuntimePolicy, row: AdminPolicyRow): void {
  applyPolicyValue(policy, row.policy_key, row.value_jsonb);
}

export function validateRuntimePolicy(policy: RuntimePolicy): string[] {
  const errors: string[] = [];

  if (policy.models.platform_default_temperature < 0 || policy.models.platform_default_temperature > 1) {
    errors.push("models.platform_default_temperature must be within [0,1]");
  }
  if (policy.models.platform_default_max_tokens < 1 || policy.models.platform_default_max_tokens > 65536) {
    errors.push("models.platform_default_max_tokens must be within [1,65536]");
  }
  if (policy.worker.max_retries < 1 || policy.worker.max_retries > 10) {
    errors.push("worker.max_retries must be within [1,10]");
  }
  if (policy.worker.claim_batch_size.min < 1) {
    errors.push("worker.claim_batch_size.min must be >= 1");
  }
  if (policy.worker.claim_batch_size.max < policy.worker.claim_batch_size.min) {
    errors.push("worker.claim_batch_size.max must be >= worker.claim_batch_size.min");
  }
  if (
    policy.worker.claim_batch_size.default < policy.worker.claim_batch_size.min ||
    policy.worker.claim_batch_size.default > policy.worker.claim_batch_size.max
  ) {
    errors.push("worker.claim_batch_size.default must be within [min,max]");
  }
  if (policy.worker.batching.pack_size < 1) {
    errors.push("worker.batching.pack_size must be >= 1");
  }
  if (policy.worker.batching.pack_size_max < policy.worker.batching.pack_size) {
    errors.push("worker.batching.pack_size_max must be >= worker.batching.pack_size");
  }
  if (
    policy.worker.batching.text_heavy_max_pack_size < 1 ||
    policy.worker.batching.text_heavy_max_pack_size > policy.worker.batching.pack_size_max
  ) {
    errors.push("worker.batching.text_heavy_max_pack_size must be within [1, pack_size_max]");
  }
  if (policy.worker.batching.context_window_tokens < 1024) {
    errors.push("worker.batching.context_window_tokens must be >= 1024");
  }
  if (policy.worker.batching.output_reserve_tokens < 256) {
    errors.push("worker.batching.output_reserve_tokens must be >= 256");
  }
  if (policy.worker.batching.tool_overhead_tokens < 0) {
    errors.push("worker.batching.tool_overhead_tokens must be >= 0");
  }
  if (policy.worker.batching.max_output_tokens < 256 || policy.worker.batching.max_output_tokens > 65536) {
    errors.push("worker.batching.max_output_tokens must be within [256,65536]");
  }
  if (
    policy.worker.batching.per_block_output_tokens < 1 ||
    policy.worker.batching.per_block_output_tokens > policy.worker.batching.max_output_tokens
  ) {
    errors.push("worker.batching.per_block_output_tokens must be within [1,max_output_tokens]");
  }
  if (policy.upload.max_files_per_batch < 1 || policy.upload.max_files_per_batch > 500) {
    errors.push("upload.max_files_per_batch must be within [1,500]");
  }
  if (policy.upload.allowed_extensions.length === 0) {
    errors.push("upload.allowed_extensions must include at least one extension");
  }

  return errors;
}

export async function listAdminPolicyRows(
  supabaseAdmin: SupabaseClient,
): Promise<AdminPolicyRow[]> {
  const { data, error } = await supabaseAdmin
    .from("admin_runtime_policy")
    .select("policy_key, value_jsonb, value_type, description, created_at, updated_at, updated_by")
    .order("policy_key", { ascending: true });
  if (error) {
    if (error.message.toLowerCase().includes("admin_runtime_policy")) {
      return [];
    }
    throw new Error(`Failed to load admin policy rows: ${error.message}`);
  }
  return (data ?? []) as AdminPolicyRow[];
}

export async function loadRuntimePolicy(
  supabaseAdmin: SupabaseClient,
): Promise<RuntimePolicy> {
  const policy = deepCopyPolicy(DEFAULT_POLICY);
  const rows = await listAdminPolicyRows(supabaseAdmin);
  for (const row of rows) {
    applyPolicyRow(policy, row);
  }
  const validationErrors = validateRuntimePolicy(policy);
  if (validationErrors.length > 0) {
    throw new Error(`Invalid admin runtime policy: ${validationErrors.join("; ")}`);
  }
  return policy;
}

export function buildRuntimePolicySnapshot(
  policy: RuntimePolicy,
  snapshotAt: string,
): RuntimePolicySnapshot {
  return {
    snapshot_at: snapshotAt,
    source: "admin_runtime_policy",
    models: policy.models,
    worker: policy.worker,
    upload: policy.upload,
  };
}

export function runtimePolicyDefaults(): RuntimePolicy {
  return deepCopyPolicy(DEFAULT_POLICY);
}
