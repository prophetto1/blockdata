import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  IconPlus,
  IconTrash,
  IconCopy,
  IconDeviceFloppy,
} from '@tabler/icons-react';
import { SwitchRoot, SwitchControl, SwitchThumb, SwitchHiddenInput } from '@/components/ui/switch';
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleIndicator, CollapsibleContent } from '@/components/ui/collapsible';
import { NumberInputRoot, NumberInputInput } from '@/components/ui/number-input';
import { FieldRoot, FieldLabel, FieldHelperText } from '@/components/ui/field';

// ─── Types ────────────────────────────────────────────────────────────────────

type ParsingProfile = {
  id: string;
  parser: string;
  config: Record<string, unknown>;
};

type DoclingConfig = {
  name?: string;
  description?: string;
  is_default?: boolean;
  pipeline?: string;
  document_timeout?: number | null;
  enable_remote_services?: boolean;
  accelerator_options?: {
    device?: string;
    num_threads?: number;
  };
  pdf_pipeline?: {
    do_ocr?: boolean;
    ocr_options?: Record<string, unknown>;
    layout_options?: Record<string, unknown>;
    do_table_structure?: boolean;
    table_structure_options?: Record<string, unknown>;
    do_code_enrichment?: boolean;
    do_formula_enrichment?: boolean;
    force_backend_text?: boolean;
    images_scale?: number;
    generate_page_images?: boolean;
    generate_picture_images?: boolean;
    [key: string]: unknown;
  };
  vlm_pipeline?: {
    vlm_options?: Record<string, unknown>;
    force_backend_text?: boolean;
    images_scale?: number;
    generate_page_images?: boolean;
  };
  asr_pipeline?: {
    asr_options?: Record<string, unknown>;
  };
  enrichments?: Record<string, unknown>;
  [key: string]: unknown;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PIPELINE_OPTIONS = [
  { value: 'standard', label: 'Standard (OCR + Layout + Tables)' },
  { value: 'vlm', label: 'VLM (Vision Language Model)' },
  { value: 'asr', label: 'ASR (Audio Speech Recognition)' },
];

const OCR_ENGINE_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'easyocr', label: 'EasyOCR' },
  { value: 'tesseract', label: 'Tesseract (CLI)' },
  { value: 'tesserocr', label: 'Tesseract (Python)' },
  { value: 'rapidocr', label: 'RapidOCR' },
  { value: 'ocrmac', label: 'macOS Vision' },
];

const LAYOUT_MODEL_OPTIONS = [
  { value: 'heron', label: 'Heron (default, fast)' },
  { value: 'egret', label: 'Egret' },
  { value: 'egret_v2', label: 'Egret V2' },
  { value: 'egret_medium', label: 'Egret Medium' },
  { value: 'egret_xlarge', label: 'Egret XLarge' },
];

const TABLE_MODE_OPTIONS = [
  { value: 'fast', label: 'Fast' },
  { value: 'accurate', label: 'Accurate' },
];

const VLM_PRESET_OPTIONS = [
  { value: 'granite_docling', label: 'GraniteDocling (recommended)' },
  { value: 'smoldocling', label: 'SmolDocling (lightweight)' },
  { value: 'phi4', label: 'Phi-4 Multimodal' },
  { value: 'granite_vision', label: 'Granite Vision 3.3-2B' },
  { value: 'pixtral', label: 'Pixtral' },
  { value: 'deepseek_ocr', label: 'DeepSeek OCR' },
  { value: 'got_ocr', label: 'GOT-OCR' },
  { value: 'qwen', label: 'Qwen VLM' },
  { value: 'gemma_12b', label: 'Gemma 12B' },
  { value: 'gemma_27b', label: 'Gemma 27B' },
  { value: 'dolphin', label: 'Dolphin' },
];

const VLM_RESPONSE_FORMAT_OPTIONS = [
  { value: 'doctags', label: 'DocTags (structured)' },
  { value: 'markdown', label: 'Markdown' },
];

const DEVICE_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'cpu', label: 'CPU' },
  { value: 'cuda', label: 'CUDA (NVIDIA GPU)' },
  { value: 'mps', label: 'MPS (Apple GPU)' },
];

const PICTURE_DESC_KIND_OPTIONS = [
  { value: 'picture_description_vlm_engine', label: 'VLM Engine (recommended)' },
  { value: 'api', label: 'API' },
];

const PICTURE_DESC_PRESET_OPTIONS = [
  { value: 'smolvlm', label: 'SmolVLM' },
  { value: 'granite_vision', label: 'Granite Vision' },
  { value: 'pixtral', label: 'Pixtral' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getIn(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let cur: unknown = obj;
  for (const key of keys) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

function setIn(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const clone = structuredClone(obj);
  const keys = path.split('.');
  let cur: Record<string, unknown> = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!;
    if (cur[key] == null || typeof cur[key] !== 'object') {
      cur[key] = {};
    }
    cur = cur[key] as Record<string, unknown>;
  }
  const lastKey = keys[keys.length - 1]!;
  cur[lastKey] = value;
  return clone;
}

// ─── Field components (thin adapters over Ark UI primitives) ──────────────────

function FieldRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <FieldRoot>
      <div className="min-w-0 flex-1">
        <FieldLabel>{label}</FieldLabel>
        {description && <FieldHelperText>{description}</FieldHelperText>}
      </div>
      <div className="shrink-0">{children}</div>
    </FieldRoot>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <SwitchRoot checked={checked} onCheckedChange={(d) => onChange(d.checked)}>
      <SwitchControl><SwitchThumb /></SwitchControl>
      <SwitchHiddenInput />
    </SwitchRoot>
  );
}

function Select({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      placeholder={placeholder}
      className="h-8 w-48 rounded-md border border-input bg-background px-2 text-xs text-foreground"
    />
  );
}

function NumberInput({ value, onChange, min, max, step }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <NumberInputRoot
      value={String(value)}
      onValueChange={(d) => { const n = parseFloat(d.value); if (!Number.isNaN(n)) onChange(n); }}
      min={min}
      max={max}
      step={step}
    >
      <NumberInputInput />
    </NumberInputRoot>
  );
}

// ─── Section component ────────────────────────────────────────────────────────

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <CollapsibleRoot defaultOpen={defaultOpen}>
      <CollapsibleTrigger>
        {title}
        <CollapsibleIndicator>&#9654;</CollapsibleIndicator>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </CollapsibleRoot>
  );
}

// ─── Config editor ────────────────────────────────────────────────────────────

function ConfigEditor({ config, onChange }: { config: DoclingConfig; onChange: (config: DoclingConfig) => void }) {
  const set = useCallback((path: string, value: unknown) => {
    onChange(setIn(config as Record<string, unknown>, path, value) as DoclingConfig);
  }, [config, onChange]);

  const get = useCallback((path: string, fallback: unknown = undefined) => {
    return getIn(config as Record<string, unknown>, path) ?? fallback;
  }, [config]);

  const pipelineMode = (get('pipeline', 'standard') as string);

  return (
    <div className="space-y-3">
      {/* General */}
      <Section title="General">
        <FieldRow label="Profile Name">
          <TextInput value={(get('name', '') as string)} onChange={(v) => set('name', v)} placeholder="Profile name" />
        </FieldRow>
        <FieldRow label="Description">
          <TextInput value={(get('description', '') as string)} onChange={(v) => set('description', v)} placeholder="Description" />
        </FieldRow>
        <FieldRow label="Default Profile" description="Use this profile when none is specified">
          <Toggle checked={!!get('is_default', false)} onChange={(v) => set('is_default', v)} />
        </FieldRow>
        <FieldRow label="Pipeline" description="Which processing pipeline to use for PDF/image documents">
          <Select value={pipelineMode} options={PIPELINE_OPTIONS} onChange={(v) => set('pipeline', v)} />
        </FieldRow>
        <FieldRow label="Document Timeout" description="Max seconds per document (0 = no limit)">
          <NumberInput value={(get('document_timeout', 0) as number)} onChange={(v) => set('document_timeout', v || null)} min={0} step={10} />
        </FieldRow>
        <FieldRow label="Enable Remote Services" description="Allow external API calls (VLM API, picture description API)">
          <Toggle checked={!!get('enable_remote_services', false)} onChange={(v) => set('enable_remote_services', v)} />
        </FieldRow>
      </Section>

      {/* Accelerator */}
      <Section title="Accelerator" defaultOpen={false}>
        <FieldRow label="Device">
          <Select value={(get('accelerator_options.device', 'auto') as string)} options={DEVICE_OPTIONS} onChange={(v) => set('accelerator_options.device', v)} />
        </FieldRow>
        <FieldRow label="Threads">
          <NumberInput value={(get('accelerator_options.num_threads', 4) as number)} onChange={(v) => set('accelerator_options.num_threads', v)} min={1} max={32} />
        </FieldRow>
      </Section>

      {/* PDF Pipeline */}
      {pipelineMode === 'standard' && (
        <>
          <Section title="OCR">
            <FieldRow label="Enable OCR">
              <Toggle checked={!!get('pdf_pipeline.do_ocr', true)} onChange={(v) => set('pdf_pipeline.do_ocr', v)} />
            </FieldRow>
            <FieldRow label="Engine">
              <Select value={(get('pdf_pipeline.ocr_options.kind', 'auto') as string)} options={OCR_ENGINE_OPTIONS} onChange={(v) => set('pdf_pipeline.ocr_options.kind', v)} />
            </FieldRow>
            <FieldRow label="Languages" description="Comma-separated language codes">
              <TextInput
                value={((get('pdf_pipeline.ocr_options.lang') as string[] | undefined) ?? []).join(', ')}
                onChange={(v) => set('pdf_pipeline.ocr_options.lang', v.split(',').map((s) => s.trim()).filter(Boolean))}
                placeholder="en, fr, de"
              />
            </FieldRow>
            <FieldRow label="Force Full Page OCR" description="OCR entire page even if native text exists">
              <Toggle checked={!!get('pdf_pipeline.ocr_options.force_full_page_ocr', false)} onChange={(v) => set('pdf_pipeline.ocr_options.force_full_page_ocr', v)} />
            </FieldRow>
            <FieldRow label="Bitmap Area Threshold" description="Fraction of page that must be bitmap to trigger OCR (0.0–1.0)">
              <NumberInput value={(get('pdf_pipeline.ocr_options.bitmap_area_threshold', 0.05) as number)} onChange={(v) => set('pdf_pipeline.ocr_options.bitmap_area_threshold', v)} min={0} max={1} step={0.01} />
            </FieldRow>

            {/* EasyOCR-specific */}
            {(get('pdf_pipeline.ocr_options.kind', 'auto') as string) === 'easyocr' && (
              <>
                <FieldRow label="Confidence Threshold">
                  <NumberInput value={(get('pdf_pipeline.ocr_options.confidence_threshold', 0.5) as number)} onChange={(v) => set('pdf_pipeline.ocr_options.confidence_threshold', v)} min={0} max={1} step={0.05} />
                </FieldRow>
              </>
            )}

            {/* Tesseract-specific */}
            {((get('pdf_pipeline.ocr_options.kind', 'auto') as string) === 'tesseract' || (get('pdf_pipeline.ocr_options.kind', 'auto') as string) === 'tesserocr') && (
              <>
                <FieldRow label="Page Segmentation Mode" description="Tesseract PSM (leave 0 for default)">
                  <NumberInput value={(get('pdf_pipeline.ocr_options.psm', 0) as number)} onChange={(v) => set('pdf_pipeline.ocr_options.psm', v || null)} min={0} max={13} />
                </FieldRow>
              </>
            )}

            {/* RapidOCR-specific */}
            {(get('pdf_pipeline.ocr_options.kind', 'auto') as string) === 'rapidocr' && (
              <>
                <FieldRow label="Backend">
                  <Select
                    value={(get('pdf_pipeline.ocr_options.backend', 'onnxruntime') as string)}
                    options={[
                      { value: 'onnxruntime', label: 'ONNX Runtime' },
                      { value: 'openvino', label: 'OpenVINO' },
                      { value: 'paddle', label: 'PaddlePaddle' },
                      { value: 'torch', label: 'PyTorch' },
                    ]}
                    onChange={(v) => set('pdf_pipeline.ocr_options.backend', v)}
                  />
                </FieldRow>
                <FieldRow label="Text Score">
                  <NumberInput value={(get('pdf_pipeline.ocr_options.text_score', 0.5) as number)} onChange={(v) => set('pdf_pipeline.ocr_options.text_score', v)} min={0} max={1} step={0.05} />
                </FieldRow>
              </>
            )}
          </Section>

          <Section title="Layout">
            <FieldRow label="Model">
              <Select value={(get('pdf_pipeline.layout_options.model', 'heron') as string)} options={LAYOUT_MODEL_OPTIONS} onChange={(v) => set('pdf_pipeline.layout_options.model', v)} />
            </FieldRow>
            <FieldRow label="Create Orphan Clusters">
              <Toggle checked={!!get('pdf_pipeline.layout_options.create_orphan_clusters', true)} onChange={(v) => set('pdf_pipeline.layout_options.create_orphan_clusters', v)} />
            </FieldRow>
          </Section>

          <Section title="Table Structure">
            <FieldRow label="Enable Table Detection">
              <Toggle checked={!!get('pdf_pipeline.do_table_structure', true)} onChange={(v) => set('pdf_pipeline.do_table_structure', v)} />
            </FieldRow>
            <FieldRow label="Mode">
              <Select value={(get('pdf_pipeline.table_structure_options.mode', 'accurate') as string)} options={TABLE_MODE_OPTIONS} onChange={(v) => set('pdf_pipeline.table_structure_options.mode', v)} />
            </FieldRow>
            <FieldRow label="Cell Matching" description="Align detected cells with OCR text">
              <Toggle checked={!!get('pdf_pipeline.table_structure_options.do_cell_matching', true)} onChange={(v) => set('pdf_pipeline.table_structure_options.do_cell_matching', v)} />
            </FieldRow>
          </Section>

          <Section title="Code & Formulas" defaultOpen={false}>
            <FieldRow label="Code Enrichment" description="Extract code blocks using VLM">
              <Toggle checked={!!get('pdf_pipeline.do_code_enrichment', false)} onChange={(v) => set('pdf_pipeline.do_code_enrichment', v)} />
            </FieldRow>
            <FieldRow label="Formula Enrichment" description="Extract math formulas using VLM">
              <Toggle checked={!!get('pdf_pipeline.do_formula_enrichment', false)} onChange={(v) => set('pdf_pipeline.do_formula_enrichment', v)} />
            </FieldRow>
          </Section>

          <Section title="Image Generation" defaultOpen={false}>
            <FieldRow label="Images Scale" description="Scaling factor for page images">
              <NumberInput value={(get('pdf_pipeline.images_scale', 1.0) as number)} onChange={(v) => set('pdf_pipeline.images_scale', v)} min={0.5} max={4} step={0.5} />
            </FieldRow>
            <FieldRow label="Generate Page Images" description="Create PNG for each page">
              <Toggle checked={!!get('pdf_pipeline.generate_page_images', false)} onChange={(v) => set('pdf_pipeline.generate_page_images', v)} />
            </FieldRow>
            <FieldRow label="Generate Picture Images" description="Extract embedded images as files">
              <Toggle checked={!!get('pdf_pipeline.generate_picture_images', false)} onChange={(v) => set('pdf_pipeline.generate_picture_images', v)} />
            </FieldRow>
            <FieldRow label="Force Backend Text" description="Use PDF native text instead of OCR/layout predictions">
              <Toggle checked={!!get('pdf_pipeline.force_backend_text', false)} onChange={(v) => set('pdf_pipeline.force_backend_text', v)} />
            </FieldRow>
          </Section>
        </>
      )}

      {/* VLM Pipeline */}
      {pipelineMode === 'vlm' && (
        <Section title="VLM Pipeline">
          <FieldRow label="Model Preset">
            <Select value={(get('vlm_pipeline.vlm_options.preset', 'granite_docling') as string)} options={VLM_PRESET_OPTIONS} onChange={(v) => set('vlm_pipeline.vlm_options.preset', v)} />
          </FieldRow>
          <FieldRow label="Response Format">
            <Select value={(get('vlm_pipeline.vlm_options.response_format', 'doctags') as string)} options={VLM_RESPONSE_FORMAT_OPTIONS} onChange={(v) => set('vlm_pipeline.vlm_options.response_format', v)} />
          </FieldRow>
          <FieldRow label="Scale">
            <NumberInput value={(get('vlm_pipeline.vlm_options.scale', 2.0) as number)} onChange={(v) => set('vlm_pipeline.vlm_options.scale', v)} min={0.5} max={4} step={0.5} />
          </FieldRow>
          <FieldRow label="Batch Size">
            <NumberInput value={(get('vlm_pipeline.vlm_options.batch_size', 1) as number)} onChange={(v) => set('vlm_pipeline.vlm_options.batch_size', v)} min={1} max={16} />
          </FieldRow>
          <FieldRow label="Force Backend Text">
            <Toggle checked={!!get('vlm_pipeline.force_backend_text', false)} onChange={(v) => set('vlm_pipeline.force_backend_text', v)} />
          </FieldRow>
        </Section>
      )}

      {/* ASR Pipeline */}
      {pipelineMode === 'asr' && (
        <Section title="ASR Pipeline">
          <FieldRow label="Model">
            <Select
              value={(get('asr_pipeline.asr_options.kind', 'whisper_native') as string)}
              options={[
                { value: 'whisper_native', label: 'Whisper (Native)' },
                { value: 'whisper_mlx', label: 'Whisper (MLX / Apple Silicon)' },
              ]}
              onChange={(v) => set('asr_pipeline.asr_options.kind', v)}
            />
          </FieldRow>
          <FieldRow label="Preset">
            <Select
              value={(get('asr_pipeline.asr_options.preset', 'whisper_tiny') as string)}
              options={[
                { value: 'whisper_tiny', label: 'Tiny' },
                { value: 'whisper_small', label: 'Small' },
                { value: 'whisper_medium', label: 'Medium' },
                { value: 'whisper_large', label: 'Large' },
              ]}
              onChange={(v) => set('asr_pipeline.asr_options.preset', v)}
            />
          </FieldRow>
        </Section>
      )}

      {/* Enrichments */}
      <Section title="Enrichments">
        <FieldRow label="Picture Classification" description="Classify images as document-image vs photograph">
          <Toggle checked={!!get('enrichments.do_picture_classification', false)} onChange={(v) => set('enrichments.do_picture_classification', v)} />
        </FieldRow>
        <FieldRow label="Picture Description" description="Generate text captions for images">
          <Toggle checked={!!get('enrichments.do_picture_description', false)} onChange={(v) => set('enrichments.do_picture_description', v)} />
        </FieldRow>
        {!!get('enrichments.do_picture_description', false) && (
          <>
            <FieldRow label="Description Engine">
              <Select
                value={(get('enrichments.picture_description_options.kind', 'picture_description_vlm_engine') as string)}
                options={PICTURE_DESC_KIND_OPTIONS}
                onChange={(v) => set('enrichments.picture_description_options.kind', v)}
              />
            </FieldRow>
            {(get('enrichments.picture_description_options.kind', 'picture_description_vlm_engine') as string) === 'picture_description_vlm_engine' && (
              <FieldRow label="VLM Preset">
                <Select
                  value={(get('enrichments.picture_description_options.preset', 'smolvlm') as string)}
                  options={PICTURE_DESC_PRESET_OPTIONS}
                  onChange={(v) => set('enrichments.picture_description_options.preset', v)}
                />
              </FieldRow>
            )}
            {(get('enrichments.picture_description_options.kind') as string) === 'api' && (
              <>
                <FieldRow label="API URL">
                  <TextInput
                    value={(get('enrichments.picture_description_options.url', '') as string)}
                    onChange={(v) => set('enrichments.picture_description_options.url', v)}
                    placeholder="http://localhost:8000/v1/chat/completions"
                  />
                </FieldRow>
                <FieldRow label="Timeout (seconds)">
                  <NumberInput value={(get('enrichments.picture_description_options.timeout', 20) as number)} onChange={(v) => set('enrichments.picture_description_options.timeout', v)} min={1} max={120} />
                </FieldRow>
                <FieldRow label="Concurrency">
                  <NumberInput value={(get('enrichments.picture_description_options.concurrency', 1) as number)} onChange={(v) => set('enrichments.picture_description_options.concurrency', v)} min={1} max={16} />
                </FieldRow>
              </>
            )}
            <FieldRow label="Prompt">
              <TextInput
                value={(get('enrichments.picture_description_options.prompt', 'Describe this image in a few sentences.') as string)}
                onChange={(v) => set('enrichments.picture_description_options.prompt', v)}
              />
            </FieldRow>
          </>
        )}
        <FieldRow label="Chart Extraction" description="Extract chart/graph data using GraniteVision">
          <Toggle checked={!!get('enrichments.do_chart_extraction', false)} onChange={(v) => set('enrichments.do_chart_extraction', v)} />
        </FieldRow>
      </Section>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function Component() {
  return <DoclingConfigPanel />;
}

export function DoclingConfigPanel() {
  const [profiles, setProfiles] = useState<ParsingProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editConfig, setEditConfig] = useState<DoclingConfig | null>(null);
  const [savedConfig, setSavedConfig] = useState<DoclingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setEditConfig(target.config as DoclingConfig);
        setSavedConfig(target.config as DoclingConfig);
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
    setEditConfig(profile.config as DoclingConfig);
    setSavedConfig(profile.config as DoclingConfig);
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
        prev.map((p) => (p.id === selectedId ? { ...p, config: editConfig as Record<string, unknown> } : p)),
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
      const newConfig: DoclingConfig = {
        name: 'New Profile',
        description: '',
        pipeline: 'standard',
        pdf_pipeline: {
          do_ocr: true,
          ocr_options: { kind: 'easyocr', lang: ['en'] },
          layout_options: { model: 'heron' },
          do_table_structure: true,
          table_structure_options: { mode: 'fast', do_cell_matching: true },
        },
        enrichments: {},
      };
      const { data, error: err } = await supabase
        .from('parsing_profiles')
        .insert({ parser: 'docling', config: newConfig })
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
      const dupeConfig = { ...structuredClone(editConfig), name: `${editConfig.name ?? 'Profile'} (copy)`, is_default: false };
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
    const config = profile.config as DoclingConfig;
    if (config.is_default) {
      setError('Cannot delete the default profile');
      return;
    }
    if (!window.confirm(`Delete "${config.name ?? 'this profile'}"?`)) return;
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
      <nav className="w-48 shrink-0 border-r border-border">
        <ScrollArea className="h-full">
          <div className="p-2 space-y-0.5">
            {profiles.map((profile) => {
              const cfg = profile.config as DoclingConfig;
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
                  <span className="text-sm font-medium">{cfg.name ?? 'Unnamed'}</span>
                  {cfg.is_default && (
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
          </div>
        </ScrollArea>
      </nav>

      {/* Config editor */}
      <div className="min-w-0 flex-1 overflow-hidden">
        {error && (
          <div className="border-b border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {editConfig ? (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <div className="text-sm font-medium text-foreground">
                {editConfig.name ?? 'Unnamed'}
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

            {/* Editor */}
            <ScrollArea className="h-[calc(100%-41px)]" contentClass="p-3 space-y-3">
              <ConfigEditor config={editConfig} onChange={setEditConfig} />
            </ScrollArea>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No profiles. Click "Add Profile" to create one.
          </div>
        )}
      </div>
    </div>
  );
}
