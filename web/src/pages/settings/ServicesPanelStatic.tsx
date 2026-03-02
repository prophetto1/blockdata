import { type ReactNode, useEffect, useState } from 'react';
import type {
  ServiceFunctionRow,
  ServiceRow,
  ServiceTypeRow,
} from './services-panel.types';
import { ServicesSidebar } from './ServicesSidebar';
import { ServiceDetailRailView } from './ServiceDetailRailView';

/* ------------------------------------------------------------------ */
/*  Hardcoded mock data — NO API calls, NO Supabase, NO mutations     */
/* ------------------------------------------------------------------ */

const MOCK_SERVICE_TYPES: ServiceTypeRow[] = [
  { service_type: 'edge', label: 'Edge Function', description: 'Supabase edge functions' },
  { service_type: 'custom', label: 'Custom', description: 'Custom HTTP services' },
];

const MOCK_SERVICES: ServiceRow[] = [
  {
    service_id: 'mock-svc-eyecite',
    service_type: 'custom',
    service_name: 'eyecite',
    base_url: 'http://localhost:8000',
    health_status: 'online',
    last_heartbeat: '2026-03-02T12:00:00Z',
    enabled: true,
    config: { auth_type: 'bearer', timeout_ms: 30000 },
    created_at: '2026-02-27T00:00:00Z',
    updated_at: '2026-03-02T00:00:00Z',
  },
  {
    service_id: 'mock-svc-docling',
    service_type: 'custom',
    service_name: 'docling',
    base_url: 'http://localhost:8000',
    health_status: 'online',
    last_heartbeat: '2026-03-02T12:00:00Z',
    enabled: true,
    config: { auth_type: 'bearer' },
    created_at: '2026-02-20T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
  },
  {
    service_id: 'mock-svc-dlt',
    service_type: 'custom',
    service_name: 'dlt-loader',
    base_url: 'http://localhost:8000',
    health_status: 'degraded',
    last_heartbeat: '2026-03-02T11:00:00Z',
    enabled: true,
    config: null,
    created_at: '2026-02-25T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
  },
  {
    service_id: 'mock-svc-disabled',
    service_type: 'edge',
    service_name: 'legacy-converter',
    base_url: 'http://localhost:8000',
    health_status: 'offline',
    last_heartbeat: null,
    enabled: false,
    config: null,
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-02-10T00:00:00Z',
  },
];

const MOCK_FUNCTIONS: ServiceFunctionRow[] = [
  /* ---- eyecite functions ---- */
  {
    function_id: 'mock-fn-clean',
    service_id: 'mock-svc-eyecite',
    function_name: 'clean',
    function_type: 'utility',
    label: 'Clean Text',
    description: 'Pre-process raw text before citation extraction. Strips HTML, normalizes whitespace, removes PDF artifacts.',
    entrypoint: '/eyecite/clean',
    http_method: 'POST',
    parameter_schema: [
      { name: 'text', type: 'string', required: true, description: 'Raw input text (may contain HTML).' },
      { name: 'steps', type: 'json', required: false, default: '["html", "inline_whitespace"]', description: 'Ordered list of cleaner names.', values: ['html', 'inline_whitespace', 'all_whitespace', 'underscores', 'xml'] },
    ],
    result_schema: { cleaned_text: 'string', original_length: 'number', cleaned_length: 'number' },
    enabled: true,
    tags: ['nlp', 'text-processing', 'legal'],
    created_at: '2026-02-27T00:00:00Z',
    updated_at: '2026-03-02T00:00:00Z',
  },
  {
    function_id: 'mock-fn-extract',
    service_id: 'mock-svc-eyecite',
    function_name: 'extract',
    function_type: 'transform',
    label: 'Extract Citations',
    description: 'Finds all legal citations in text. Returns typed citation objects with span offsets, matched text, and metadata.',
    entrypoint: '/eyecite/extract',
    http_method: 'POST',
    parameter_schema: [
      { name: 'text', type: 'string', required: true, description: 'Plain text to extract citations from.' },
      { name: 'markup_text', type: 'string', required: false, description: 'Original HTML/XML for markup-aware extraction.' },
      { name: 'clean_steps', type: 'json', required: false, description: 'Cleaning steps to apply before extraction.' },
      { name: 'remove_ambiguous', type: 'boolean', required: false, default: false, description: 'Drop citations with ambiguous reporters.' },
      { name: 'resolve', type: 'boolean', required: false, default: false, description: 'Also resolve citations after extraction.' },
    ],
    result_schema: { citations: 'array', count: 'number', resolutions: 'array', unique_resources: 'number' },
    enabled: true,
    tags: ['nlp', 'legal', 'citation'],
    created_at: '2026-02-27T00:00:00Z',
    updated_at: '2026-03-02T00:00:00Z',
  },
  {
    function_id: 'mock-fn-resolve',
    service_id: 'mock-svc-eyecite',
    function_name: 'resolve',
    function_type: 'transform',
    label: 'Resolve Citations',
    description: 'Links short-form, supra, id, and reference citations back to their full citation. Groups all references to the same case.',
    entrypoint: '/eyecite/resolve',
    http_method: 'POST',
    parameter_schema: [
      { name: 'text', type: 'string', required: true, description: 'Text containing citations to resolve.' },
      { name: 'clean_steps', type: 'json', required: false, description: 'Cleaning steps to apply before extraction.' },
    ],
    result_schema: { resolutions: 'array', unique_resources: 'number', total_citations: 'number' },
    enabled: true,
    tags: ['nlp', 'legal', 'citation'],
    created_at: '2026-02-27T00:00:00Z',
    updated_at: '2026-03-02T00:00:00Z',
  },
  {
    function_id: 'mock-fn-annotate',
    service_id: 'mock-svc-eyecite',
    function_name: 'annotate',
    function_type: 'transform',
    label: 'Annotate Citations',
    description: 'Inserts HTML markup around citation spans in text. Supports source-text offset translation for annotating original HTML.',
    entrypoint: '/eyecite/annotate',
    http_method: 'POST',
    parameter_schema: [
      { name: 'text', type: 'string', required: true, description: 'Plain text to annotate.' },
      { name: 'source_text', type: 'string', required: false, description: 'Original HTML for offset translation.' },
      { name: 'before_tag', type: 'string', required: false, default: '<span class="citation">', description: 'HTML inserted before each citation.' },
      { name: 'after_tag', type: 'string', required: false, default: '</span>', description: 'HTML inserted after each citation.' },
      { name: 'unbalanced_tags', type: 'enum', required: false, default: 'skip', description: 'How to handle unbalanced HTML tags.', values: ['unchecked', 'skip', 'wrap'] },
      { name: 'clean_steps', type: 'json', required: false, description: 'Cleaning steps to apply before extraction.' },
    ],
    result_schema: { annotated_text: 'string', citation_count: 'number' },
    enabled: true,
    tags: ['nlp', 'legal', 'html'],
    created_at: '2026-02-27T00:00:00Z',
    updated_at: '2026-03-02T00:00:00Z',
  },
  {
    function_id: 'mock-fn-pipeline',
    service_id: 'mock-svc-eyecite',
    function_name: 'pipeline',
    function_type: 'transform',
    label: 'Full Pipeline',
    description: 'Full eyecite pipeline: clean, extract, resolve, and optionally annotate in one call. Configurable output format.',
    entrypoint: '/eyecite/pipeline',
    http_method: 'POST',
    parameter_schema: [
      { name: 'text', type: 'string', required: true, description: 'Raw text (may contain HTML).' },
      { name: 'clean_steps', type: 'json', required: false, default: '["html", "inline_whitespace"]', description: 'Cleaning pipeline.' },
      { name: 'remove_ambiguous', type: 'boolean', required: false, default: false, description: 'Drop ambiguous reporter citations.' },
      { name: 'annotate', type: 'boolean', required: false, default: false, description: 'Return annotated text with citation markup.' },
      { name: 'before_tag', type: 'string', required: false, default: '<span class="citation">', description: 'HTML before each citation.' },
      { name: 'after_tag', type: 'string', required: false, default: '</span>', description: 'HTML after each citation.' },
      { name: 'output_format', type: 'enum', required: false, default: 'full', description: 'What to include in the response.', values: ['full', 'citations_only', 'resolved_only', 'annotated_only'] },
    ],
    result_schema: { cleaned_text: 'string', citations: 'array', count: 'number', resolutions: 'array', unique_resources: 'number', annotated_text: 'string' },
    enabled: true,
    tags: ['nlp', 'legal', 'pipeline'],
    created_at: '2026-02-27T00:00:00Z',
    updated_at: '2026-03-02T00:00:00Z',
  },
  {
    function_id: 'mock-fn-reporters',
    service_id: 'mock-svc-eyecite',
    function_name: 'reporters',
    function_type: 'source',
    label: 'Query Reporters',
    description: 'Query the reporters-db: 1,167 reporters with 2,102 name variations.',
    entrypoint: '/eyecite/reporters',
    http_method: 'GET',
    parameter_schema: [
      { name: 'search', type: 'string', required: false, description: 'Filter reporters by name.' },
      { name: 'limit', type: 'number', required: false, default: 50, description: 'Max results to return.' },
    ],
    result_schema: { reporters: 'array', count: 'number' },
    enabled: true,
    tags: ['legal', 'reference-data'],
    created_at: '2026-02-27T00:00:00Z',
    updated_at: '2026-03-02T00:00:00Z',
  },
  {
    function_id: 'mock-fn-courts',
    service_id: 'mock-svc-eyecite',
    function_name: 'courts',
    function_type: 'source',
    label: 'Query Courts',
    description: 'Query the courts-db: ~400 US courts with hierarchy and date ranges.',
    entrypoint: '/eyecite/courts',
    http_method: 'GET',
    parameter_schema: [
      { name: 'search', type: 'string', required: false, description: 'Filter courts by name or jurisdiction.' },
      { name: 'jurisdiction', type: 'string', required: false, description: 'Filter by jurisdiction code.' },
      { name: 'limit', type: 'number', required: false, default: 50, description: 'Max results to return.' },
    ],
    result_schema: { courts: 'array', count: 'number' },
    enabled: true,
    tags: ['legal', 'reference-data'],
    created_at: '2026-02-27T00:00:00Z',
    updated_at: '2026-03-02T00:00:00Z',
  },
  {
    function_id: 'mock-fn-health',
    service_id: 'mock-svc-eyecite',
    function_name: 'health',
    function_type: 'utility',
    label: 'Health Check',
    description: 'Returns service health and version info.',
    entrypoint: '/eyecite/health',
    http_method: 'GET',
    parameter_schema: [],
    result_schema: { status: 'string', version: 'string', uptime_seconds: 'number' },
    enabled: true,
    tags: ['health'],
    created_at: '2026-02-27T00:00:00Z',
    updated_at: '2026-03-02T00:00:00Z',
  },
  /* ---- docling functions ---- */
  {
    function_id: 'mock-fn-parse-pdf',
    service_id: 'mock-svc-docling',
    function_name: 'parse_pdf',
    function_type: 'parse',
    label: 'Parse PDF',
    description: 'Extract structured content from PDF documents using docling.',
    entrypoint: '/docling/parse',
    http_method: 'POST',
    parameter_schema: [
      { name: 'file_url', type: 'string', required: true, description: 'URL of the PDF file to parse.' },
      { name: 'output_format', type: 'enum', required: false, default: 'markdown', description: 'Output format.', values: ['markdown', 'json', 'docling'] },
      { name: 'ocr', type: 'boolean', required: false, default: true, description: 'Enable OCR for scanned pages.' },
    ],
    result_schema: { content: 'string', pages: 'number', format: 'string' },
    enabled: true,
    tags: ['parsing', 'pdf'],
    created_at: '2026-02-20T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
  },
  {
    function_id: 'mock-fn-parse-html',
    service_id: 'mock-svc-docling',
    function_name: 'parse_html',
    function_type: 'parse',
    label: 'Parse HTML',
    description: 'Extract structured content from HTML pages.',
    entrypoint: '/docling/parse_html',
    http_method: 'POST',
    parameter_schema: [
      { name: 'url', type: 'string', required: true, description: 'URL of the page to parse.' },
      { name: 'include_tables', type: 'boolean', required: false, default: true, description: 'Extract tables as structured data.' },
    ],
    result_schema: { content: 'string', tables: 'array' },
    enabled: true,
    tags: ['parsing', 'html'],
    created_at: '2026-02-20T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
  },
  /* ---- dlt functions ---- */
  {
    function_id: 'mock-fn-dlt-load',
    service_id: 'mock-svc-dlt',
    function_name: 'filesystem_load',
    function_type: 'source',
    label: 'Filesystem Load',
    description: 'Load files from a filesystem source using dlt.',
    entrypoint: '/dlt/load/filesystem',
    http_method: 'POST',
    parameter_schema: [
      { name: 'source_path', type: 'string', required: true, description: 'Path to source directory or file pattern.' },
      { name: 'destination', type: 'string', required: true, description: 'Destination identifier.' },
      { name: 'file_glob', type: 'string', required: false, default: '**/*', description: 'Glob pattern for file selection.' },
    ],
    result_schema: { rows_loaded: 'number', files_processed: 'number' },
    enabled: true,
    tags: ['dlt', 'load', 'filesystem'],
    created_at: '2026-02-25T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
  },
  /* ---- disabled service function ---- */
  {
    function_id: 'mock-fn-legacy',
    service_id: 'mock-svc-disabled',
    function_name: 'convert_v1',
    function_type: 'convert',
    label: 'Legacy Convert',
    description: 'Deprecated v1 conversion endpoint.',
    entrypoint: '/convert/v1',
    http_method: 'POST',
    parameter_schema: [
      { name: 'input', type: 'string', required: true, description: 'Raw input data.' },
    ],
    result_schema: { output: 'string' },
    enabled: false,
    tags: ['deprecated'],
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-02-10T00:00:00Z',
  },
];

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

type ServicesPanelStaticProps = {
  onSetHeaderAction?: (node: ReactNode) => void;
};

/* ------------------------------------------------------------------ */
/*  Static panel — same layout, zero API calls                         */
/* ------------------------------------------------------------------ */

export function ServicesPanelStatic({ onSetHeaderAction }: ServicesPanelStaticProps) {
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    MOCK_SERVICES[0]?.service_id ?? null,
  );

  const selectedService = MOCK_SERVICES.find((s) => s.service_id === selectedServiceId) ?? null;

  const functionsForSelected = selectedServiceId
    ? MOCK_FUNCTIONS.filter((f) => f.service_id === selectedServiceId)
    : [];

  /* Push close button into frame header (mirrors wired panel) */
  useEffect(() => {
    if (!onSetHeaderAction) return;
    if (selectedServiceId) {
      onSetHeaderAction(
        <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-500">
          STATIC — no backend
        </span>,
      );
    } else {
      onSetHeaderAction(null);
    }
    return () => onSetHeaderAction(null);
  }, [selectedServiceId, onSetHeaderAction]);

  /* No-op handlers */
  const noop = () => {};

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 gap-0 overflow-hidden">
        <ServicesSidebar
          services={MOCK_SERVICES}
          functions={MOCK_FUNCTIONS}
          serviceTypes={MOCK_SERVICE_TYPES}
          selectedServiceId={selectedServiceId}
          onSelectService={setSelectedServiceId}
          loading={false}
        />

        {selectedService ? (
          <ServiceDetailRailView
            service={selectedService}
            functions={functionsForSelected}
            savingKey={null}
            notice={null}
            onDismissNotice={noop}
            onToggleFunctionEnabled={noop}
            onSaveFunctionJson={noop}
            isAdmin={false}
          />
        ) : (
          <div className="flex min-w-0 flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a service to view details.
          </div>
        )}
      </div>
    </div>
  );
}