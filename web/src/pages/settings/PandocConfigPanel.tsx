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
import { SegmentGroupRoot, SegmentGroupIndicator, SegmentGroupItem, SegmentGroupItemText, SegmentGroupItemHiddenInput } from '@/components/ui/segment-group';
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleIndicator, CollapsibleContent } from '@/components/ui/collapsible';
import { NumberInputRoot, NumberInputInput } from '@/components/ui/number-input';
import { FieldRoot, FieldLabel, FieldHelperText } from '@/components/ui/field';

// ─── Types ────────────────────────────────────────────────────────────────────

type ParsingProfile = {
  id: string;
  parser: string;
  config: Record<string, unknown>;
};

type PandocConfig = {
  name?: string;
  description?: string;
  is_default?: boolean;
  from?: string | null;
  to?: string;
  extensions?: Record<string, boolean | null>;
  reader?: {
    standalone?: boolean;
    columns?: number;
    tab_stop?: number;
    default_image_extension?: string;
    track_changes?: string;
    strip_comments?: boolean;
    indented_code_classes?: string[];
    abbreviations?: string | null;
    [key: string]: unknown;
  };
  writer?: {
    wrap?: string;
    columns?: number;
    tab_stop?: number;
    ascii?: boolean;
    eol?: string;
    standalone?: boolean;
    toc?: boolean;
    toc_depth?: number;
    lof?: boolean;
    lot?: boolean;
    number_sections?: boolean;
    shift_heading_level_by?: number;
    top_level_division?: string;
    section_divs?: boolean;
    markdown_headings?: string;
    reference_links?: boolean;
    reference_location?: string;
    figure_caption_position?: string;
    table_caption_position?: string;
    html_math_method?: { method?: string; url?: string | null };
    html_q_tags?: boolean;
    email_obfuscation?: string;
    id_prefix?: string;
    embed_resources?: boolean;
    syntax_highlighting?: string;
    dpi?: number;
    slide_level?: number | null;
    incremental?: boolean;
    list_tables?: boolean;
    ipynb_output?: string;
    link_images?: boolean;
    [key: string]: unknown;
  };
  metadata?: Record<string, unknown>;
  variables?: Record<string, string>;
  citations?: {
    citeproc?: boolean;
    cite_method?: string;
    bibliography?: string[];
    csl?: string | null;
    citation_abbreviations?: string | null;
  };
  filters?: Array<string | { type: string; path: string }>;
  template?: string | null;
  css?: string[];
  reference_doc?: string | null;
  epub?: {
    cover_image?: string | null;
    fonts?: string[];
    subdirectory?: string;
    title_page?: boolean;
    split_level?: number;
  };
  pdf?: {
    engine?: string;
    engine_opts?: string[];
  };
  sandbox?: boolean;
  file_scope?: boolean;
  [key: string]: unknown;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const INPUT_FORMAT_OPTIONS = [
  { value: '', label: '(auto-detect)' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'latex', label: 'LaTeX' },
  { value: 'html', label: 'HTML' },
  { value: 'docx', label: 'DOCX' },
  { value: 'rst', label: 'reStructuredText' },
  { value: 'epub', label: 'EPUB' },
  { value: 'org', label: 'Org-mode' },
  { value: 'commonmark_x', label: 'CommonMark (extended)' },
  { value: 'csv', label: 'CSV' },
  { value: 'typst', label: 'Typst' },
];

const OUTPUT_FORMAT_OPTIONS = [
  { value: 'json', label: 'Pandoc AST (JSON)' },
  { value: 'html', label: 'HTML' },
  { value: 'latex', label: 'LaTeX' },
  { value: 'docx', label: 'DOCX' },
  { value: 'pdf', label: 'PDF' },
  { value: 'epub', label: 'EPUB' },
  { value: 'rst', label: 'reStructuredText' },
  { value: 'plain', label: 'Plain text' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'commonmark_x', label: 'CommonMark (extended)' },
];

const WRAP_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'none', label: 'None' },
  { value: 'preserve', label: 'Preserve' },
];

const TRACK_CHANGES_OPTIONS = [
  { value: 'accept', label: 'Accept' },
  { value: 'reject', label: 'Reject' },
  { value: 'all', label: 'Show All' },
];

const TOP_LEVEL_DIVISION_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'section', label: 'Section' },
  { value: 'chapter', label: 'Chapter' },
  { value: 'part', label: 'Part' },
];

const MATH_METHOD_OPTIONS = [
  { value: 'plain', label: 'Plain' },
  { value: 'mathjax', label: 'MathJax' },
  { value: 'katex', label: 'KaTeX' },
  { value: 'mathml', label: 'MathML' },
  { value: 'webtex', label: 'WebTeX' },
  { value: 'gladtex', label: 'GladTeX' },
];

const CITE_METHOD_OPTIONS = [
  { value: 'citeproc', label: 'Citeproc (built-in)' },
  { value: 'natbib', label: 'natbib (LaTeX)' },
  { value: 'biblatex', label: 'biblatex (LaTeX)' },
];

const HEADING_STYLE_OPTIONS = [
  { value: 'atx', label: 'ATX (# heading)' },
  { value: 'setext', label: 'Setext (underline)' },
];

const REFERENCE_LOCATION_OPTIONS = [
  { value: 'document', label: 'End of document' },
  { value: 'section', label: 'End of section' },
  { value: 'block', label: 'End of block' },
];

const PDF_ENGINE_OPTIONS = [
  { value: 'pdflatex', label: 'pdflatex' },
  { value: 'lualatex', label: 'lualatex' },
  { value: 'xelatex', label: 'xelatex' },
  { value: 'latexmk', label: 'latexmk' },
  { value: 'tectonic', label: 'tectonic' },
  { value: 'typst', label: 'typst' },
  { value: 'weasyprint', label: 'weasyprint' },
  { value: 'wkhtmltopdf', label: 'wkhtmltopdf' },
  { value: 'pagedjs-cli', label: 'pagedjs-cli' },
  { value: 'prince', label: 'prince' },
  { value: 'context', label: 'context' },
  { value: 'pdfroff', label: 'pdfroff' },
];

const IPYNB_OUTPUT_OPTIONS = [
  { value: 'best', label: 'Best' },
  { value: 'all', label: 'All' },
  { value: 'none', label: 'None' },
];

// Extensions organized by category for the UI
const EXTENSION_GROUPS: Array<{ label: string; extensions: Array<{ key: string; label: string; description?: string }> }> = [
  {
    label: 'Typography',
    extensions: [
      { key: 'smart', label: 'Smart quotes & dashes', description: 'Curly quotes, em/en dashes, ellipses' },
    ],
  },
  {
    label: 'Math',
    extensions: [
      { key: 'tex_math_dollars', label: 'Dollar math', description: '$...$ and $$...$$' },
      { key: 'tex_math_gfm', label: 'GFM math', description: 'GitHub-style math blocks' },
      { key: 'tex_math_single_backslash', label: 'Backslash math', description: '\\(...\\) and \\[...\\]' },
      { key: 'latex_macros', label: 'LaTeX macros', description: 'Parse \\newcommand etc.' },
    ],
  },
  {
    label: 'Headings',
    extensions: [
      { key: 'auto_identifiers', label: 'Auto identifiers', description: 'Auto-generate header IDs' },
      { key: 'ascii_identifiers', label: 'ASCII identifiers', description: 'ASCII-only header IDs' },
      { key: 'gfm_auto_identifiers', label: 'GFM identifiers', description: 'GitHub-style header IDs' },
      { key: 'header_attributes', label: 'Header attributes', description: '{#id .class} on headers' },
    ],
  },
  {
    label: 'Tables',
    extensions: [
      { key: 'pipe_tables', label: 'Pipe tables', description: '| col | col | syntax' },
      { key: 'simple_tables', label: 'Simple tables' },
      { key: 'multiline_tables', label: 'Multiline tables' },
      { key: 'grid_tables', label: 'Grid tables' },
      { key: 'table_captions', label: 'Table captions' },
    ],
  },
  {
    label: 'Lists',
    extensions: [
      { key: 'fancy_lists', label: 'Fancy lists', description: 'Letters, roman numerals' },
      { key: 'startnum', label: 'Start number', description: 'Respect ordered list start' },
      { key: 'definition_lists', label: 'Definition lists' },
      { key: 'example_lists', label: 'Example lists' },
      { key: 'task_lists', label: 'Task lists', description: 'GitHub-style checkboxes' },
    ],
  },
  {
    label: 'Inline Formatting',
    extensions: [
      { key: 'footnotes', label: 'Footnotes' },
      { key: 'inline_notes', label: 'Inline notes' },
      { key: 'citations', label: 'Citations' },
      { key: 'strikeout', label: 'Strikethrough', description: '~~text~~' },
      { key: 'superscript', label: 'Superscript', description: '^text^' },
      { key: 'subscript', label: 'Subscript', description: '~text~' },
      { key: 'mark', label: 'Highlight', description: '==text==' },
      { key: 'emoji', label: 'Emoji', description: ':smile: codes' },
      { key: 'bracketed_spans', label: 'Bracketed spans', description: '[text]{.class}' },
      { key: 'fenced_divs', label: 'Fenced divs', description: '::: syntax' },
    ],
  },
  {
    label: 'Code',
    extensions: [
      { key: 'fenced_code_blocks', label: 'Fenced code blocks' },
      { key: 'backtick_code_blocks', label: 'Backtick code blocks' },
      { key: 'fenced_code_attributes', label: 'Code block attributes' },
      { key: 'inline_code_attributes', label: 'Inline code attributes' },
    ],
  },
  {
    label: 'HTML & Raw',
    extensions: [
      { key: 'raw_html', label: 'Raw HTML' },
      { key: 'raw_tex', label: 'Raw TeX' },
      { key: 'raw_attribute', label: 'Raw attribute blocks' },
      { key: 'native_divs', label: 'Native divs', description: 'Parse <div> as Div' },
      { key: 'native_spans', label: 'Native spans', description: 'Parse <span> as Span' },
      { key: 'markdown_in_html_blocks', label: 'Markdown in HTML' },
    ],
  },
  {
    label: 'Metadata',
    extensions: [
      { key: 'yaml_metadata_block', label: 'YAML metadata' },
      { key: 'pandoc_title_block', label: 'Pandoc title block' },
      { key: 'mmd_title_block', label: 'MultiMarkdown title block' },
    ],
  },
  {
    label: 'Line Handling',
    extensions: [
      { key: 'hard_line_breaks', label: 'Hard line breaks', description: 'All newlines become breaks' },
      { key: 'escaped_line_breaks', label: 'Escaped line breaks', description: 'Backslash = hard break' },
      { key: 'ignore_line_breaks', label: 'Ignore line breaks' },
      { key: 'east_asian_line_breaks', label: 'East Asian line breaks' },
    ],
  },
  {
    label: 'Links & Images',
    extensions: [
      { key: 'implicit_figures', label: 'Implicit figures', description: 'Lone image becomes figure' },
      { key: 'link_attributes', label: 'Link attributes' },
      { key: 'autolink_bare_uris', label: 'Autolink bare URLs' },
      { key: 'wikilinks_title_after_pipe', label: 'Wikilinks [[target|title]]' },
      { key: 'wikilinks_title_before_pipe', label: 'Wikilinks [[title|target]]' },
    ],
  },
  {
    label: 'Misc',
    extensions: [
      { key: 'intraword_underscores', label: 'Intraword underscores', description: '_ inside words is literal' },
      { key: 'all_symbols_escapable', label: 'All symbols escapable' },
      { key: 'literate_haskell', label: 'Literate Haskell' },
      { key: 'sourcepos', label: 'Source positions' },
      { key: 'rebase_relative_paths', label: 'Rebase relative paths' },
      { key: 'alerts', label: 'GFM alerts' },
      { key: 'gutenberg', label: 'Project Gutenberg' },
      { key: 'styles', label: 'DOCX styles' },
      { key: 'native_numbering', label: 'Native numbering (ODT/DOCX)' },
    ],
  },
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

function TriToggle({ value, onChange }: { value: boolean | null; onChange: (v: boolean | null) => void }) {
  const triMap: Record<string, boolean | null> = { default: null, on: true, off: false };
  return (
    <SegmentGroupRoot
      value={value === null ? 'default' : value ? 'on' : 'off'}
      onValueChange={(d) => onChange(d.value ? triMap[d.value] ?? null : null)}
    >
      <SegmentGroupIndicator />
      <SegmentGroupItem value="default"><SegmentGroupItemText>default</SegmentGroupItemText><SegmentGroupItemHiddenInput /></SegmentGroupItem>
      <SegmentGroupItem value="on"><SegmentGroupItemText>on</SegmentGroupItemText><SegmentGroupItemHiddenInput /></SegmentGroupItem>
      <SegmentGroupItem value="off"><SegmentGroupItemText>off</SegmentGroupItemText><SegmentGroupItemHiddenInput /></SegmentGroupItem>
    </SegmentGroupRoot>
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

function ConfigEditor({ config, onChange }: { config: PandocConfig; onChange: (config: PandocConfig) => void }) {
  const set = useCallback((path: string, value: unknown) => {
    onChange(setIn(config as Record<string, unknown>, path, value) as PandocConfig);
  }, [config, onChange]);

  const get = useCallback((path: string, fallback: unknown = undefined) => {
    return getIn(config as Record<string, unknown>, path) ?? fallback;
  }, [config]);

  const outputFormat = (get('to', 'json') as string);
  const inputFormat = (get('from', '') as string);

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
        <FieldRow label="Input Format" description="Source document format">
          <Select value={inputFormat} options={INPUT_FORMAT_OPTIONS} onChange={(v) => set('from', v || null)} />
        </FieldRow>
        <FieldRow label="Output Format" description="Target format (usually JSON AST for pipeline)">
          <Select value={outputFormat} options={OUTPUT_FORMAT_OPTIONS} onChange={(v) => set('to', v)} />
        </FieldRow>
        <FieldRow label="Sandbox" description="Disable network and absolute path access">
          <Toggle checked={!!get('sandbox', true)} onChange={(v) => set('sandbox', v)} />
        </FieldRow>
        <FieldRow label="File Scope" description="Parse each input file independently before combining">
          <Toggle checked={!!get('file_scope', false)} onChange={(v) => set('file_scope', v)} />
        </FieldRow>
      </Section>

      {/* Reader Options */}
      <Section title="Reader Options">
        <FieldRow label="Tab Stop" description="Spaces per tab">
          <NumberInput value={(get('reader.tab_stop', 4) as number)} onChange={(v) => set('reader.tab_stop', v)} min={1} max={16} />
        </FieldRow>
        <FieldRow label="Columns" description="Assumed terminal width">
          <NumberInput value={(get('reader.columns', 80) as number)} onChange={(v) => set('reader.columns', v)} min={40} max={200} />
        </FieldRow>
        <FieldRow label="Default Image Extension" description="Extension for images without one">
          <TextInput value={(get('reader.default_image_extension', '') as string)} onChange={(v) => set('reader.default_image_extension', v)} placeholder="e.g. png" />
        </FieldRow>
        {inputFormat === 'docx' && (
          <FieldRow label="Track Changes" description="How to handle DOCX tracked changes">
            <Select value={(get('reader.track_changes', 'accept') as string)} options={TRACK_CHANGES_OPTIONS} onChange={(v) => set('reader.track_changes', v)} />
          </FieldRow>
        )}
        {(inputFormat === 'html' || inputFormat === '') && (
          <FieldRow label="Strip HTML Comments" description="Remove HTML comments instead of treating as raw">
            <Toggle checked={!!get('reader.strip_comments', false)} onChange={(v) => set('reader.strip_comments', v)} />
          </FieldRow>
        )}
      </Section>

      {/* Writer Options */}
      <Section title="Writer Options">
        <FieldRow label="Text Wrapping">
          <Select value={(get('writer.wrap', 'auto') as string)} options={WRAP_OPTIONS} onChange={(v) => set('writer.wrap', v)} />
        </FieldRow>
        <FieldRow label="Line Width" description="Columns for text wrapping">
          <NumberInput value={(get('writer.columns', 72) as number)} onChange={(v) => set('writer.columns', v)} min={20} max={200} />
        </FieldRow>
        <FieldRow label="Prefer ASCII" description="Escape unicode characters">
          <Toggle checked={!!get('writer.ascii', false)} onChange={(v) => set('writer.ascii', v)} />
        </FieldRow>
        <FieldRow label="Standalone" description="Produce complete document with header/footer">
          <Toggle checked={!!get('writer.standalone', false)} onChange={(v) => set('writer.standalone', v)} />
        </FieldRow>
      </Section>

      {/* Document Structure */}
      <Section title="Document Structure" defaultOpen={false}>
        <FieldRow label="Table of Contents">
          <Toggle checked={!!get('writer.toc', false)} onChange={(v) => set('writer.toc', v)} />
        </FieldRow>
        <FieldRow label="TOC Depth" description="How many heading levels">
          <NumberInput value={(get('writer.toc_depth', 3) as number)} onChange={(v) => set('writer.toc_depth', v)} min={1} max={6} />
        </FieldRow>
        <FieldRow label="Number Sections">
          <Toggle checked={!!get('writer.number_sections', false)} onChange={(v) => set('writer.number_sections', v)} />
        </FieldRow>
        <FieldRow label="Shift Heading Level" description="Shift all headings by N levels">
          <NumberInput value={(get('writer.shift_heading_level_by', 0) as number)} onChange={(v) => set('writer.shift_heading_level_by', v)} min={-5} max={5} />
        </FieldRow>
        <FieldRow label="Top-Level Division">
          <Select value={(get('writer.top_level_division', 'default') as string)} options={TOP_LEVEL_DIVISION_OPTIONS} onChange={(v) => set('writer.top_level_division', v)} />
        </FieldRow>
        <FieldRow label="Section Divs" description="Wrap sections in <div> tags (HTML)">
          <Toggle checked={!!get('writer.section_divs', false)} onChange={(v) => set('writer.section_divs', v)} />
        </FieldRow>
        <FieldRow label="List of Figures">
          <Toggle checked={!!get('writer.lof', false)} onChange={(v) => set('writer.lof', v)} />
        </FieldRow>
        <FieldRow label="List of Tables">
          <Toggle checked={!!get('writer.lot', false)} onChange={(v) => set('writer.lot', v)} />
        </FieldRow>
      </Section>

      {/* Markdown Output */}
      <Section title="Markdown / RST Output" defaultOpen={false}>
        <FieldRow label="Heading Style">
          <Select value={(get('writer.markdown_headings', 'atx') as string)} options={HEADING_STYLE_OPTIONS} onChange={(v) => set('writer.markdown_headings', v)} />
        </FieldRow>
        <FieldRow label="Reference Links" description="Use reference-style links instead of inline">
          <Toggle checked={!!get('writer.reference_links', false)} onChange={(v) => set('writer.reference_links', v)} />
        </FieldRow>
        <FieldRow label="Reference Location">
          <Select value={(get('writer.reference_location', 'document') as string)} options={REFERENCE_LOCATION_OPTIONS} onChange={(v) => set('writer.reference_location', v)} />
        </FieldRow>
        <FieldRow label="List Tables (RST)" description="Use list tables in RST output">
          <Toggle checked={!!get('writer.list_tables', false)} onChange={(v) => set('writer.list_tables', v)} />
        </FieldRow>
      </Section>

      {/* HTML Output */}
      <Section title="HTML Output" defaultOpen={false}>
        <FieldRow label="Math Method">
          <Select value={(get('writer.html_math_method.method', 'plain') as string)} options={MATH_METHOD_OPTIONS} onChange={(v) => set('writer.html_math_method.method', v)} />
        </FieldRow>
        {(get('writer.html_math_method.method') as string) && (get('writer.html_math_method.method') as string) !== 'plain' && (
          <FieldRow label="Math URL" description="Service URL for MathJax/KaTeX/WebTeX">
            <TextInput value={(get('writer.html_math_method.url', '') as string)} onChange={(v) => set('writer.html_math_method.url', v || null)} placeholder="https://cdn.jsdelivr.net/..." />
          </FieldRow>
        )}
        <FieldRow label="Syntax Highlighting">
          <TextInput value={(get('writer.syntax_highlighting', 'default') as string)} onChange={(v) => set('writer.syntax_highlighting', v)} placeholder="default, none, or style name" />
        </FieldRow>
        <FieldRow label="Embed Resources" description="Inline CSS/JS in HTML output">
          <Toggle checked={!!get('writer.embed_resources', false)} onChange={(v) => set('writer.embed_resources', v)} />
        </FieldRow>
        <FieldRow label="DPI" description="Pixels per inch for image sizing">
          <NumberInput value={(get('writer.dpi', 96) as number)} onChange={(v) => set('writer.dpi', v)} min={72} max={600} />
        </FieldRow>
        <FieldRow label="ID Prefix" description="Prefix for all HTML identifiers">
          <TextInput value={(get('writer.id_prefix', '') as string)} onChange={(v) => set('writer.id_prefix', v)} placeholder="e.g. doc-" />
        </FieldRow>
      </Section>

      {/* Citations */}
      <Section title="Citations & Bibliography" defaultOpen={false}>
        <FieldRow label="Enable Citeproc" description="Process citations using built-in citeproc">
          <Toggle checked={!!get('citations.citeproc', false)} onChange={(v) => set('citations.citeproc', v)} />
        </FieldRow>
        <FieldRow label="Citation Method">
          <Select value={(get('citations.cite_method', 'citeproc') as string)} options={CITE_METHOD_OPTIONS} onChange={(v) => set('citations.cite_method', v)} />
        </FieldRow>
        <FieldRow label="CSL Style" description="Path to CSL stylesheet">
          <TextInput value={(get('citations.csl', '') as string)} onChange={(v) => set('citations.csl', v || null)} placeholder="path/to/style.csl" />
        </FieldRow>
      </Section>

      {/* Jupyter */}
      {(inputFormat === 'ipynb' || outputFormat === 'ipynb') && (
        <Section title="Jupyter Notebook" defaultOpen={false}>
          <FieldRow label="Output Mode" description="Which cell outputs to include">
            <Select value={(get('writer.ipynb_output', 'best') as string)} options={IPYNB_OUTPUT_OPTIONS} onChange={(v) => set('writer.ipynb_output', v)} />
          </FieldRow>
        </Section>
      )}

      {/* EPUB */}
      {(inputFormat === 'epub' || outputFormat === 'epub') && (
        <Section title="EPUB Options" defaultOpen={false}>
          <FieldRow label="Title Page" description="Include title page">
            <Toggle checked={!!get('epub.title_page', true)} onChange={(v) => set('epub.title_page', v)} />
          </FieldRow>
          <FieldRow label="Split Level" description="Header level for chapter splitting (1-6)">
            <NumberInput value={(get('epub.split_level', 1) as number)} onChange={(v) => set('epub.split_level', v)} min={1} max={6} />
          </FieldRow>
          <FieldRow label="Subdirectory" description="OCF container subdirectory name">
            <TextInput value={(get('epub.subdirectory', 'EPUB') as string)} onChange={(v) => set('epub.subdirectory', v)} />
          </FieldRow>
        </Section>
      )}

      {/* PDF */}
      {outputFormat === 'pdf' && (
        <Section title="PDF Engine" defaultOpen={false}>
          <FieldRow label="Engine">
            <Select value={(get('pdf.engine', 'pdflatex') as string)} options={PDF_ENGINE_OPTIONS} onChange={(v) => set('pdf.engine', v)} />
          </FieldRow>
        </Section>
      )}

      {/* Slides */}
      <Section title="Slides" defaultOpen={false}>
        <FieldRow label="Slide Level" description="Header level that creates slides (0 = auto)">
          <NumberInput value={(get('writer.slide_level', 0) as number)} onChange={(v) => set('writer.slide_level', v || null)} min={0} max={6} />
        </FieldRow>
        <FieldRow label="Incremental Lists" description="Reveal list items one at a time">
          <Toggle checked={!!get('writer.incremental', false)} onChange={(v) => set('writer.incremental', v)} />
        </FieldRow>
      </Section>

      {/* Extensions */}
      {EXTENSION_GROUPS.map((group) => (
        <Section key={group.label} title={`Extensions: ${group.label}`} defaultOpen={false}>
          {group.extensions.map((ext) => (
            <FieldRow key={ext.key} label={ext.label} description={ext.description}>
              <TriToggle
                value={(get(`extensions.${ext.key}`) as boolean | null) ?? null}
                onChange={(v) => set(`extensions.${ext.key}`, v)}
              />
            </FieldRow>
          ))}
        </Section>
      ))}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function Component() {
  return <PandocConfigPanel />;
}

export function PandocConfigPanel() {
  const [profiles, setProfiles] = useState<ParsingProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editConfig, setEditConfig] = useState<PandocConfig | null>(null);
  const [savedConfig, setSavedConfig] = useState<PandocConfig | null>(null);
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
        .eq('parser', 'pandoc')
        .order('id');
      if (err) throw err;
      setProfiles(data ?? []);
      if (data && data.length > 0) {
        const current = selectedId ? data.find((p) => p.id === selectedId) : null;
        const target = current ?? data[0]!;
        setSelectedId(target.id);
        setEditConfig(target.config as PandocConfig);
        setSavedConfig(target.config as PandocConfig);
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
    setEditConfig(profile.config as PandocConfig);
    setSavedConfig(profile.config as PandocConfig);
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
      const newConfig: PandocConfig = {
        name: 'New Profile',
        description: '',
        from: null,
        to: 'json',
        extensions: { smart: true },
        reader: { tab_stop: 4 },
        writer: { wrap: 'none' },
        sandbox: true,
      };
      const { data, error: err } = await supabase
        .from('parsing_profiles')
        .insert({ parser: 'pandoc', config: newConfig })
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
        .insert({ parser: 'pandoc', config: dupeConfig })
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
    const cfg = profile.config as PandocConfig;
    if (cfg.is_default) {
      setError('Cannot delete the default profile');
      return;
    }
    if (!window.confirm(`Delete "${cfg.name ?? 'this profile'}"?`)) return;
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
    return <p className="p-4 text-sm text-muted-foreground">Loading pandoc profiles...</p>;
  }

  return (
    <div className="flex h-full min-h-0 gap-0 overflow-hidden">
      {/* Profile list */}
      <nav className="w-48 shrink-0 border-r border-border">
        <ScrollArea className="h-full">
          <div className="p-2 space-y-0.5">
            {profiles.map((profile) => {
              const cfg = profile.config as PandocConfig;
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
                  {cfg.from && <span className="text-[10px] text-muted-foreground">{cfg.from}</span>}
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
