import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { IconPlus, IconTrash, IconCopy, IconDeviceFloppy, IconChevronRight } from '@tabler/icons-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ParsingProfile = {
  id: string;
  parser: string;
  config: Record<string, unknown>;
};

// ─── Accurate docling default config from source ─────────────────────────────
// Derived from docling/datamodel/pipeline_options.py, accelerator_options.py,
// pipeline_options_vlm_model.py, pipeline_options_asr_model.py, and related.
// This is the PdfPipelineOptions default (the most comprehensive pipeline).

const DOCLING_DEFAULT_CONFIG: Record<string, unknown> = {
  // PipelineOptions base
  document_timeout: null,
  accelerator_options: {
    num_threads: 4,
    device: 'auto',
    cuda_use_flash_attention2: false,
  },
  enable_remote_services: false,
  allow_external_plugins: false,
  artifacts_path: null,

  // ConvertPipelineOptions
  do_picture_classification: false,
  picture_classification_options: {
    kind: 'document_picture_classifier',
  },
  do_picture_description: false,
  picture_description_options: {
    kind: 'picture_description_vlm_engine',
    batch_size: 8,
    scale: 2.0,
    picture_area_threshold: 0.05,
    classification_allow: null,
    classification_deny: null,
    classification_min_confidence: 0.0,
    prompt: 'Describe this image in a few sentences.',
    generation_config: { max_new_tokens: 200, do_sample: false },
  },
  do_chart_extraction: false,

  // PaginatedPipelineOptions
  images_scale: 1.0,
  generate_page_images: false,
  generate_picture_images: false,

  // PdfPipelineOptions
  do_table_structure: true,
  do_ocr: true,
  do_code_enrichment: false,
  do_formula_enrichment: false,
  force_backend_text: false,

  table_structure_options: {
    kind: 'docling_tableformer',
    do_cell_matching: true,
    mode: 'accurate',
  },

  ocr_options: {
    kind: 'auto',
    lang: [],
    force_full_page_ocr: false,
    bitmap_area_threshold: 0.05,
  },

  layout_options: {
    kind: 'docling_layout_default',
    keep_empty_clusters: false,
    skip_cell_assignment: false,
    create_orphan_clusters: true,
    model_spec: {
      name: 'docling_layout_heron',
      repo_id: 'docling-project/docling-layout-heron',
    },
  },

  code_formula_options: {
    kind: 'codeformulav2',
    scale: 2.0,
    max_size: null,
    extract_code: true,
    extract_formulas: true,
  },

  generate_table_images: false,
  generate_parsed_pages: false,

  // Threaded pipeline batch options
  ocr_batch_size: 4,
  layout_batch_size: 4,
  table_batch_size: 4,
  batch_polling_interval_seconds: 0.5,
  queue_max_size: 100,

  // ─── Alternative pipeline configs (for reference) ───────────────────────

  _vlm_pipeline_options: {
    generate_page_images: true,
    force_backend_text: false,
    vlm_options: {
      kind: 'granite_docling',
      scale: 2.0,
      max_size: null,
      batch_size: 1,
      force_backend_text: false,
    },
  },

  _asr_pipeline_options: {
    asr_options: {
      kind: 'inline_model_options',
      repo_id: 'openai/whisper-tiny',
      verbose: false,
      timestamps: true,
      temperature: 0.0,
      max_new_tokens: 256,
      max_time_chunk: 30.0,
      torch_dtype: null,
      inference_framework: 'whisper',
      language: 'en',
      word_timestamps: true,
    },
  },

  // ─── OCR engine configs (alternatives to ocr_options above) ─────────────

  _ocr_engines: {
    easyocr: {
      kind: 'easyocr',
      lang: ['fr', 'de', 'es', 'en'],
      use_gpu: null,
      confidence_threshold: 0.5,
      model_storage_directory: null,
      recog_network: 'standard',
      download_enabled: true,
      suppress_mps_warnings: true,
      force_full_page_ocr: false,
      bitmap_area_threshold: 0.05,
    },
    tesseract_cli: {
      kind: 'tesseract',
      lang: ['fra', 'deu', 'spa', 'eng'],
      tesseract_cmd: 'tesseract',
      path: null,
      psm: null,
      force_full_page_ocr: false,
      bitmap_area_threshold: 0.05,
    },
    tesserocr: {
      kind: 'tesserocr',
      lang: ['fra', 'deu', 'spa', 'eng'],
      path: null,
      psm: null,
      force_full_page_ocr: false,
      bitmap_area_threshold: 0.05,
    },
    rapidocr: {
      kind: 'rapidocr',
      lang: ['english', 'chinese'],
      backend: 'onnxruntime',
      text_score: 0.5,
      use_det: null,
      use_cls: null,
      use_rec: null,
      print_verbose: false,
      det_model_path: null,
      cls_model_path: null,
      rec_model_path: null,
      rec_keys_path: null,
      font_path: null,
      rapidocr_params: {},
      force_full_page_ocr: false,
      bitmap_area_threshold: 0.05,
    },
    ocrmac: {
      kind: 'ocrmac',
      lang: ['fr-FR', 'de-DE', 'es-ES', 'en-US'],
      recognition: 'accurate',
      framework: 'vision',
      force_full_page_ocr: false,
      bitmap_area_threshold: 0.05,
    },
  },

  // ─── Picture description API config (alternative) ───────────────────────

  _picture_description_api: {
    kind: 'api',
    url: 'http://localhost:8000/v1/chat/completions',
    headers: {},
    params: {},
    timeout: 20.0,
    concurrency: 1,
    prompt: 'Describe this image in a few sentences.',
    provenance: '',
    batch_size: 8,
    scale: 2.0,
    picture_area_threshold: 0.05,
  },

  // ─── Layout model options ───────────────────────────────────────────────

  _layout_models: {
    heron: { name: 'docling_layout_heron', repo_id: 'docling-project/docling-layout-heron' },
    egret_medium: { name: 'docling_layout_egret_medium', repo_id: 'docling-project/docling-layout-egret-medium' },
    egret_large: { name: 'docling_layout_egret_large', repo_id: 'docling-project/docling-layout-egret-large' },
    egret_xlarge: { name: 'docling_layout_egret_xlarge', repo_id: 'docling-project/docling-layout-egret-xlarge' },
  },

  // ─── VLM presets ────────────────────────────────────────────────────────

  _vlm_presets: {
    granite_docling: 'docling-project/granite-docling (recommended)',
    smoldocling: 'ds4sd/SmolDocling-256M-preview (lightweight)',
    deepseek_ocr: 'deepseek-ai/DeepSeek-OCR',
    granite_vision: 'ibm-granite/granite-vision-3.3-2b',
    pixtral: 'mistralai/Pixtral-12B-2409',
    got_ocr: 'stepfun-ai/GOT-OCR-2.0-hf',
    phi4: 'microsoft/Phi-4-multimodal-instruct',
    qwen: 'Qwen/Qwen2.5-VL-3B-Instruct',
    gemma_12b: 'google/gemma-3-12b-it',
    gemma_27b: 'google/gemma-3-27b-it',
    dolphin: 'fixie-ai/ultravox-v0_5-llama-3_2-1b',
  },

  // ─── ASR presets ────────────────────────────────────────────────────────

  _asr_presets: {
    whisper_tiny: 'openai/whisper-tiny',
    whisper_small: 'openai/whisper-small',
    whisper_medium: 'openai/whisper-medium',
    whisper_large: 'openai/whisper-large-v3',
  },
};

// ─── Dynamic JSON tree renderer ──────────────────────────────────────────────

type JsonNodeProps = {
  keyName: string;
  value: unknown;
  path: string;
  onChange: (path: string, value: unknown) => void;
  depth?: number;
};

function JsonNode({ keyName, value, path, onChange, depth = 0 }: JsonNodeProps) {
  const [collapsed, setCollapsed] = useState(depth > 1);

  const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
  const isArray = Array.isArray(value);
  const isCompound = isObject || isArray;
  const isReference = keyName.startsWith('_');

  if (isCompound) {
    const entries = isArray
      ? (value as unknown[]).map((v, i) => [String(i), v] as [string, unknown])
      : Object.entries(value as Record<string, unknown>);
    const count = entries.length;

    return (
      <div className={cn('group/node', depth > 0 && 'ml-4')}>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex items-center gap-1 py-0.5 text-left text-sm hover:bg-accent/30 rounded px-1 -ml-1 w-full',
            isReference && 'opacity-60',
          )}
        >
          <IconChevronRight
            size={14}
            className={cn(
              'shrink-0 text-muted-foreground transition-transform',
              !collapsed && 'rotate-90',
            )}
          />
          <span className="font-medium text-foreground">{keyName}</span>
          <span className="text-xs text-muted-foreground ml-1">
            {isArray ? `[${count}]` : `{${count}}`}
          </span>
          {isReference && (
            <span className="text-[10px] text-muted-foreground ml-1 italic">reference</span>
          )}
        </button>
        {!collapsed && (
          <div className="border-l border-border/50 ml-1.5">
            {entries.map(([k, v]) => (
              <JsonNode
                key={k}
                keyName={k}
                value={v}
                path={path ? `${path}.${k}` : k}
                onChange={onChange}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Leaf node — editable
  return (
    <div className={cn('flex items-center gap-2 py-0.5 ml-4', depth > 0 && 'ml-4')}>
      <span className="text-sm text-muted-foreground shrink-0 min-w-[140px]">{keyName}</span>
      <LeafEditor value={value} onChange={(v) => onChange(path, v)} />
    </div>
  );
}

function LeafEditor({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  if (value === null) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground italic">null</span>
        <button
          type="button"
          onClick={() => onChange('')}
          className="text-[10px] text-primary hover:underline"
        >
          set
        </button>
      </div>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full border transition-colors',
          value ? 'border-primary bg-primary' : 'border-input bg-muted',
        )}
      >
        <span
          className={cn(
            'block h-4 w-4 rounded-full bg-background shadow transition-transform',
            value ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </button>
    );
  }

  if (typeof value === 'number') {
    return (
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const num = parseFloat(e.currentTarget.value);
          if (!Number.isNaN(num)) onChange(num);
        }}
        step="any"
        className="h-7 w-28 rounded-md border border-input bg-background px-2 text-xs text-foreground"
      />
    );
  }

  // String
  const strValue = String(value);
  return (
    <input
      type="text"
      value={strValue}
      onChange={(e) => onChange(e.currentTarget.value)}
      className="h-7 min-w-[200px] flex-1 rounded-md border border-input bg-background px-2 text-xs text-foreground"
    />
  );
}

// ─── Deep path helpers ───────────────────────────────────────────────────────

function setDeep(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const clone = structuredClone(obj);
  const keys = path.split('.');
  let cur: Record<string, unknown> = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!;
    if (cur[key] == null || typeof cur[key] !== 'object') cur[key] = {};
    cur = cur[key] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1]!] = value;
  return clone;
}

// ─── Main panel ──────────────────────────────────────────────────────────────

export function Component() {
  const [profiles, setProfiles] = useState<ParsingProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editConfig, setEditConfig] = useState<Record<string, unknown> | null>(null);
  const [savedConfig, setSavedConfig] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDefaults, setShowDefaults] = useState(false);

  const isDirty = useMemo(() => {
    if (!editConfig || !savedConfig) return false;
    return JSON.stringify(editConfig) !== JSON.stringify(savedConfig);
  }, [editConfig, savedConfig]);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('parsing_profiles')
        .select('*')
        .eq('parser', 'docling')
        .order('id');
      if (err) throw err;
      setProfiles(data ?? []);
      if (data && data.length > 0) {
        const current = selectedId ? data.find((p) => p.id === selectedId) : null;
        const target = current ?? data[0]!;
        setSelectedId(target.id);
        setEditConfig(target.config as Record<string, unknown>);
        setSavedConfig(target.config as Record<string, unknown>);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    loadProfiles();
  }, []);

  const selectProfile = useCallback((profile: ParsingProfile) => {
    setSelectedId(profile.id);
    setEditConfig(profile.config);
    setSavedConfig(profile.config);
  }, []);

  const handleChange = useCallback((path: string, value: unknown) => {
    setEditConfig((prev) => (prev ? setDeep(prev, path, value) : prev));
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedId || !editConfig || saving) return;
    setSaving(true);
    setError(null);
    try {
      const { error: err } = await supabase
        .from('parsing_profiles')
        .update({ config: editConfig })
        .eq('id', selectedId);
      if (err) throw err;
      setSavedConfig(structuredClone(editConfig));
      setProfiles((prev) =>
        prev.map((p) => (p.id === selectedId ? { ...p, config: editConfig } : p)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [selectedId, editConfig, saving]);

  const handleCreate = useCallback(async () => {
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('parsing_profiles')
        .insert({ parser: 'docling', config: { name: 'New Profile', pipeline: 'standard' } })
        .select()
        .single();
      if (err) throw err;
      if (data) {
        setProfiles((prev) => [...prev, data]);
        selectProfile(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile');
    }
  }, [selectProfile]);

  const handleDuplicate = useCallback(async () => {
    if (!editConfig) return;
    setError(null);
    try {
      const dupeConfig = {
        ...structuredClone(editConfig),
        name: `${(editConfig.name as string) ?? 'Profile'} (copy)`,
        is_default: false,
      };
      const { data, error: err } = await supabase
        .from('parsing_profiles')
        .insert({ parser: 'docling', config: dupeConfig })
        .select()
        .single();
      if (err) throw err;
      if (data) {
        setProfiles((prev) => [...prev, data]);
        selectProfile(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate profile');
    }
  }, [editConfig, selectProfile]);

  const handleDelete = useCallback(async () => {
    if (!selectedId) return;
    const profile = profiles.find((p) => p.id === selectedId);
    if (!profile) return;
    const cfg = profile.config as Record<string, unknown>;
    if (cfg.is_default) {
      setError('Cannot delete the default profile');
      return;
    }
    if (!window.confirm(`Delete "${(cfg.name as string) ?? 'this profile'}"?`)) return;
    setError(null);
    try {
      const { error: err } = await supabase
        .from('parsing_profiles')
        .delete()
        .eq('id', selectedId);
      if (err) throw err;
      const remaining = profiles.filter((p) => p.id !== selectedId);
      setProfiles(remaining);
      if (remaining.length > 0) {
        selectProfile(remaining[0]!);
      } else {
        setSelectedId(null);
        setEditConfig(null);
        setSavedConfig(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete profile');
    }
  }, [selectedId, profiles, selectProfile]);

  if (loading) {
    return <p className="p-4 text-sm text-muted-foreground">Loading docling profiles...</p>;
  }

  return (
    <div className="flex h-full min-h-0 gap-0 overflow-hidden">
      {/* Profile list */}
      <nav className="w-52 shrink-0 border-r border-border">
        <ScrollArea className="h-full">
          <div className="p-2 space-y-0.5">
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Profiles
            </div>
            {profiles.map((profile) => {
              const cfg = profile.config as Record<string, unknown>;
              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => selectProfile(profile)}
                  className={cn(
                    'flex w-full flex-col items-start rounded-md px-2.5 py-1.5 text-left transition-colors',
                    profile.id === selectedId
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                  )}
                >
                  <span className="text-sm font-medium">{(cfg.name as string) ?? 'Unnamed'}</span>
                  {Boolean(cfg.is_default) && (
                    <span className="text-[10px] font-medium text-primary">default</span>
                  )}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => { void handleCreate(); }}
              className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            >
              <IconPlus size={14} />
              Add Profile
            </button>

            <div className="my-2 border-t border-border" />
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Reference
            </div>
            <button
              type="button"
              onClick={() => {
                setShowDefaults(true);
                setSelectedId(null);
              }}
              className={cn(
                'flex w-full items-start rounded-md px-2.5 py-1.5 text-left text-sm transition-colors',
                showDefaults && !selectedId
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              )}
            >
              Docling Defaults
            </button>
          </div>
        </ScrollArea>
      </nav>

      {/* Editor area */}
      <div className="min-w-0 flex-1 overflow-hidden">
        {error && (
          <div className="border-b border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {showDefaults && !selectedId ? (
          <>
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <div className="text-sm font-medium text-foreground">
                Docling Default Config (read-only reference)
              </div>
            </div>
            <ScrollArea className="h-[calc(100%-41px)]">
              <div className="p-3">
                {Object.entries(DOCLING_DEFAULT_CONFIG).map(([k, v]) => (
                  <JsonNode
                    key={k}
                    keyName={k}
                    value={v}
                    path={k}
                    onChange={() => {}}
                    depth={0}
                  />
                ))}
              </div>
            </ScrollArea>
          </>
        ) : editConfig ? (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <div className="text-sm font-medium text-foreground">
                {(editConfig.name as string) ?? 'Unnamed'}
                {isDirty && <span className="ml-2 text-xs text-muted-foreground">(unsaved)</span>}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => { void handleDuplicate(); }}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                  title="Duplicate profile"
                >
                  <IconCopy size={13} />
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => { void handleDelete(); }}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs text-red-500 hover:bg-red-500/10"
                  title="Delete profile"
                >
                  <IconTrash size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => { void handleSave(); }}
                  disabled={!isDirty || saving}
                  className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <IconDeviceFloppy size={13} />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>

            {/* Dynamic tree */}
            <ScrollArea className="h-[calc(100%-41px)]">
              <div className="p-3">
                {Object.entries(editConfig).map(([k, v]) => (
                  <JsonNode
                    key={k}
                    keyName={k}
                    value={v}
                    path={k}
                    onChange={handleChange}
                    depth={0}
                  />
                ))}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Select a profile or view defaults.
          </div>
        )}
      </div>
    </div>
  );
}
