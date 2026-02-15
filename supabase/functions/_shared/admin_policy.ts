import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type IngestTrack = "mdast" | "docling" | "pandoc";

export type TrackEnabledMap = Record<IngestTrack, boolean>;
export type ExtensionTrackRouting = Record<string, IngestTrack>;
export type TrackCapabilityCatalog = {
  version: string;
  tracks: Record<IngestTrack, { extensions: string[] }>;
};
export type ParserArtifactSourceTypes = {
  docling: string[];
  pandoc: string[];
};

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
    track_enabled: TrackEnabledMap;
    extension_track_routing: ExtensionTrackRouting;
    track_capability_catalog: TrackCapabilityCatalog;
    parser_artifact_source_types: ParserArtifactSourceTypes;
  };
  track_b: {
    api_enabled: boolean;
    worker_enabled: boolean;
  };
};

export type RuntimePolicySnapshot = {
  snapshot_at: string;
  source: "admin_runtime_policy";
  models: RuntimePolicy["models"];
  worker: RuntimePolicy["worker"];
  upload: RuntimePolicy["upload"];
  track_b: RuntimePolicy["track_b"];
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

const ALL_TRACKS: IngestTrack[] = ["mdast", "docling", "pandoc"];

const DEFAULT_POLICY: RuntimePolicy = {
  models: {
    platform_default_model: "claude-sonnet-4-5-20250929",
    platform_default_temperature: 0.3,
    platform_default_max_tokens: 4096,
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
    track_enabled: {
      mdast: true,
      docling: true,
      pandoc: false,
    },
    extension_track_routing: {
      md: "mdast",
      markdown: "mdast",
      txt: "mdast",
      docx: "docling",
      pdf: "docling",
      pptx: "docling",
      xlsx: "docling",
      html: "docling",
      htm: "docling",
      csv: "docling",
      rst: "pandoc",
      tex: "pandoc",
      latex: "pandoc",
      odt: "pandoc",
      epub: "pandoc",
      rtf: "pandoc",
      org: "pandoc",
    },
    track_capability_catalog: {
      version: "2026-02-13",
      tracks: {
        mdast: {
          extensions: ["md", "markdown", "txt"],
        },
        docling: {
          extensions: ["docx", "pdf", "pptx", "xlsx", "html", "htm", "csv"],
        },
        pandoc: {
          extensions: ["rst", "tex", "latex", "odt", "epub", "rtf", "org"],
        },
      },
    },
    parser_artifact_source_types: {
      docling: ["docx", "pdf", "pptx", "xlsx", "html", "csv"],
      pandoc: ["docx", "html", "txt", "rst", "latex", "odt", "epub", "rtf", "org"],
    },
  },
  track_b: {
    api_enabled: true,
    worker_enabled: true,
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

function normalizeExtensionToken(value: string): string {
  return value.trim().toLowerCase().replace(/^\./, "");
}

function asNormalizedExtensionArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const out: string[] = [];
  for (const v of value) {
    const s = asString(v);
    if (!s) return null;
    out.push(normalizeExtensionToken(s));
  }
  return out;
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asTrack(value: unknown): IngestTrack | null {
  if (value !== "mdast" && value !== "docling" && value !== "pandoc") return null;
  return value;
}

function asTrackEnabledMap(value: unknown): TrackEnabledMap | null {
  const obj = asObject(value);
  if (!obj) return null;
  const parsed: Partial<TrackEnabledMap> = {};
  for (const track of ALL_TRACKS) {
    const v = asBoolean(obj[track]);
    if (v === null) return null;
    parsed[track] = v;
  }
  return parsed as TrackEnabledMap;
}

function asExtensionTrackRouting(value: unknown): ExtensionTrackRouting | null {
  const obj = asObject(value);
  if (!obj) return null;
  const out: ExtensionTrackRouting = {};
  for (const [rawExt, rawTrack] of Object.entries(obj)) {
    const track = asTrack(rawTrack);
    if (!track) return null;
    const ext = normalizeExtensionToken(rawExt);
    if (!ext) return null;
    out[ext] = track;
  }
  return out;
}

function asTrackCapabilityCatalog(value: unknown): TrackCapabilityCatalog | null {
  const obj = asObject(value);
  if (!obj) return null;
  const version = asString(obj.version);
  if (!version) return null;

  const tracksObj = asObject(obj.tracks);
  if (!tracksObj) return null;

  const tracks: Partial<TrackCapabilityCatalog["tracks"]> = {};
  for (const track of ALL_TRACKS) {
    const entry = asObject(tracksObj[track]);
    if (!entry) return null;
    const extArray = asNormalizedExtensionArray(entry.extensions);
    if (!extArray || extArray.length === 0) return null;
    tracks[track] = { extensions: extArray };
  }

  return {
    version,
    tracks: tracks as TrackCapabilityCatalog["tracks"],
  };
}

function asParserArtifactSourceTypes(value: unknown): ParserArtifactSourceTypes | null {
  const obj = asObject(value);
  if (!obj) return null;
  const docling = asNormalizedExtensionArray(obj.docling);
  const pandoc = asNormalizedExtensionArray(obj.pandoc);
  if (!docling || !pandoc || docling.length === 0 || pandoc.length === 0) return null;
  return { docling, pandoc };
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
    const parsed = asNormalizedExtensionArray(value);
    if (!parsed || parsed.length === 0) return false;
    policy.upload.allowed_extensions = parsed;
    return true;
  }
  if (key === "upload.track_enabled") {
    const parsed = asTrackEnabledMap(value);
    if (!parsed) return false;
    policy.upload.track_enabled = parsed;
    return true;
  }
  if (key === "upload.extension_track_routing") {
    const parsed = asExtensionTrackRouting(value);
    if (!parsed) return false;
    policy.upload.extension_track_routing = parsed;
    return true;
  }
  if (key === "upload.track_capability_catalog") {
    const parsed = asTrackCapabilityCatalog(value);
    if (!parsed) return false;
    policy.upload.track_capability_catalog = parsed;
    return true;
  }
  if (key === "upload.parser_artifact_source_types") {
    const parsed = asParserArtifactSourceTypes(value);
    if (!parsed) return false;
    policy.upload.parser_artifact_source_types = parsed;
    return true;
  }
  if (key === "track_b.api_enabled") {
    const parsed = asBoolean(value);
    if (parsed === null) return false;
    policy.track_b.api_enabled = parsed;
    return true;
  }
  if (key === "track_b.worker_enabled") {
    const parsed = asBoolean(value);
    if (parsed === null) return false;
    policy.track_b.worker_enabled = parsed;
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
  if (!policy.upload.track_capability_catalog.version.trim()) {
    errors.push("upload.track_capability_catalog.version must be non-empty");
  }
  if (policy.upload.parser_artifact_source_types.docling.length === 0) {
    errors.push("upload.parser_artifact_source_types.docling must include at least one source_type");
  }
  if (policy.upload.parser_artifact_source_types.pandoc.length === 0) {
    errors.push("upload.parser_artifact_source_types.pandoc must include at least one source_type");
  }

  for (const track of ALL_TRACKS) {
    if (!Array.isArray(policy.upload.track_capability_catalog.tracks[track].extensions)) {
      errors.push(`upload.track_capability_catalog.tracks.${track}.extensions must be an array`);
      continue;
    }
    if (policy.upload.track_capability_catalog.tracks[track].extensions.length === 0) {
      errors.push(`upload.track_capability_catalog.tracks.${track}.extensions must include at least one extension`);
    }
  }

  const seenAllowed = new Set<string>();
  for (const ext of policy.upload.allowed_extensions) {
    if (seenAllowed.has(ext)) {
      errors.push(`upload.allowed_extensions contains duplicate extension: ${ext}`);
      continue;
    }
    seenAllowed.add(ext);

    const track = policy.upload.extension_track_routing[ext];
    if (!track) {
      errors.push(`upload.extension_track_routing must include mapping for allowed extension: ${ext}`);
      continue;
    }
    if (!policy.upload.track_enabled[track]) {
      errors.push(`upload.track_enabled.${track} must be true for allowed extension: ${ext}`);
      continue;
    }
    const capSet = new Set(policy.upload.track_capability_catalog.tracks[track].extensions);
    if (!capSet.has(ext)) {
      errors.push(`routing/capability mismatch: extension ${ext} routed to ${track} but missing from capability catalog`);
    }
  }

  for (const [ext, track] of Object.entries(policy.upload.extension_track_routing)) {
    const capSet = new Set(policy.upload.track_capability_catalog.tracks[track].extensions);
    if (!capSet.has(ext)) {
      errors.push(`routing/capability mismatch: extension ${ext} routed to ${track} but missing from capability catalog`);
    }
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
    track_b: policy.track_b,
  };
}

export function runtimePolicyDefaults(): RuntimePolicy {
  return deepCopyPolicy(DEFAULT_POLICY);
}
