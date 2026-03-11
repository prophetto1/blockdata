# Implementation Plan: Pandoc & Docling Parser Config in Superuser Area

> 2026-03-10 — Move parser config panels into superuser drill nav, add full pandoc config support.

## Context

The Docling config panel was placed in Settings > Admin (`/app/settings/admin/parsers-docling`). It belongs in the Superuser area (`/app/superuser/parsers-docling`). This plan moves it there, adds the equivalent Pandoc panel, and defines the complete Pandoc jsonb config schema using pandoc's actual defaults-file field names.

### Current State

| Item | Status | Location |
|------|--------|----------|
| `parsing_profiles` table | Created (migration 075) | `id`, `parser`, `config` columns |
| Docling seed profiles | Seeded (migration 075) | 4 profiles: Fast, Balanced, High Quality, AI Vision |
| Pandoc seed profiles | Seeded (migration 076) | 8 profiles: Default, Academic LaTeX, RST, EPUB, DOCX, Org, Wiki, Typst |
| DoclingConfigPanel.tsx | Built | `web/src/pages/settings/DoclingConfigPanel.tsx` |
| PandocConfigPanel.tsx | Built (draft) | `web/src/pages/settings/PandocConfigPanel.tsx` |
| Nav entry (docling) | Wrong place | `settings-tabs.ts` → `parsers-docling` under Admin |
| Nav entry (pandoc) | Added to superuser drill | `nav-config.ts` (partial — needs routes) |
| Router | Missing | No superuser routes for either panel |

### Files to Touch

```
web/src/components/shell/nav-config.ts           # already done — Parsers section added
web/src/router.tsx                                # add 2 lazy routes
web/src/pages/superuser/SuperuserParsersDocling.tsx  # new thin wrapper
web/src/pages/superuser/SuperuserParsersPandoc.tsx   # new thin wrapper
web/src/pages/settings/settings-tabs.ts           # remove parsers-docling
web/src/pages/settings/SettingsAdmin.tsx           # remove parsers-docling branch
web/src/pages/settings/PandocConfigPanel.tsx       # rewrite with full config
supabase/migrations/20260310130000_076_pandoc_parsing_profiles.sql  # already done
```

---

## Step 1: Move Docling Config Panel to Superuser Area

### 1a. Create superuser wrapper page

Create `web/src/pages/superuser/SuperuserParsersDocling.tsx`:

```tsx
import { DoclingConfigPanel } from '@/pages/settings/DoclingConfigPanel';

export function Component() {
  return (
    <div className="h-full w-full overflow-hidden">
      <DoclingConfigPanel />
    </div>
  );
}
```

### 1b. Remove from Settings Admin

**`settings-tabs.ts`** — Remove `'parsers-docling'` from `CATEGORY_IDS` array and from the `ADMIN_SUBTAB_GROUPS` tabs array.

Before:
```ts
export const CATEGORY_IDS = [
  'instance-config',
  'worker-config',
  'platform-config',
  'parsers-docling',
  'audit',
] as const;
```

After:
```ts
export const CATEGORY_IDS = [
  'instance-config',
  'worker-config',
  'platform-config',
  'audit',
] as const;
```

Also remove the `{ id: 'parsers-docling', label: 'Parsers: Docling' }` entry from the tabs array.

**`SettingsAdmin.tsx`** — Remove the `DoclingConfigPanel` import and the `selectedCategory === 'parsers-docling'` conditional branch. Remove `{ id: 'parsers-docling', label: 'Parsers: Docling' }` from the `CATEGORIES` array.

### 1c. Add router entry

In `router.tsx`, inside the superuser children array, add:

```ts
{ path: 'parsers-docling', lazy: () => import('@/pages/superuser/SuperuserParsersDocling') },
```

---

## Step 2: Add Pandoc Config Panel to Superuser Area

### 2a. Create superuser wrapper page

Create `web/src/pages/superuser/SuperuserParsersPandoc.tsx`:

```tsx
import { PandocConfigPanel } from '@/pages/settings/PandocConfigPanel';

export function Component() {
  return (
    <div className="h-full w-full overflow-hidden">
      <PandocConfigPanel />
    </div>
  );
}
```

### 2b. Add router entry

In `router.tsx`, inside the superuser children array, add:

```ts
{ path: 'parsers-pandoc', lazy: () => import('@/pages/superuser/SuperuserParsersPandoc') },
```

### 2c. Nav config (already done)

The `nav-config.ts` already has a "Parsers" section in `SUPERUSER_DRILL` with both Docling and Pandoc items pointing to `/app/superuser/parsers-docling` and `/app/superuser/parsers-pandoc`.

---

## Step 3: Pandoc Config Schema — Complete Reference

The jsonb config stored in `parsing_profiles.config` where `parser = 'pandoc'` uses **pandoc's defaults-file field names exactly**. This is the canonical reference from pandoc's MANUAL.txt (v3.6+). Every field is optional — omitted fields use pandoc defaults.

### Profile metadata (our fields, not pandoc's)

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Profile display name |
| `description` | string | Human description |
| `is_default` | boolean | Whether this is the default profile |

### General options

| defaults-file field | CLI flag | Type | Default | Description |
|---------------------|----------|------|---------|-------------|
| `from` | `--from` | string | (auto-detect) | Input format, e.g. `"markdown+emoji"`, `"latex"`, `"rst"` |
| `to` | `--to` | string | `"json"` | Output format. Our pipeline uses `"json"` (pandoc AST) |
| `verbosity` | `--verbose`/`--quiet` | `"ERROR"` \| `"WARNING"` \| `"INFO"` | `"WARNING"` | Log verbosity level |
| `fail-if-warnings` | `--fail-if-warnings` | boolean | `false` | Exit with error on warnings |
| `sandbox` | `--sandbox` | boolean | `false` | Restrict IO to specified files only |
| `log-file` | `--log` | string \| null | null | Path for JSON log output |

### Reader options

| defaults-file field | CLI flag | Type | Default | Description |
|---------------------|----------|------|---------|-------------|
| `shift-heading-level-by` | `--shift-heading-level-by` | integer | `0` | Shift all heading levels by N |
| `indented-code-classes` | `--indented-code-classes` | string[] | `[]` | Default classes for indented code blocks |
| `default-image-extension` | `--default-image-extension` | string | `""` | Extension for images without one |
| `file-scope` | `--file-scope` | boolean | `false` | Parse each file independently before combining |
| `filters` | `--filter`/`--lua-filter`/`--citeproc` | array | `[]` | Ordered list of filters (see filter format below) |
| `metadata` | `--metadata` | object | `{}` | Key-value metadata pairs (parsed as YAML) |
| `metadata-files` | `--metadata-file` | string[] | `[]` | Paths to YAML/JSON metadata files |
| `preserve-tabs` | `--preserve-tabs` | boolean | `false` | Keep tabs instead of converting to spaces |
| `tab-stop` | `--tab-stop` | integer | `4` | Spaces per tab |
| `track-changes` | `--track-changes` | `"accept"` \| `"reject"` \| `"all"` | `"accept"` | DOCX track changes handling |
| `extract-media` | `--extract-media` | string \| null | null | Directory to extract embedded media |
| `abbreviations` | `--abbreviations` | string \| null | null | Custom abbreviations file |
| `trace` | `--trace` | boolean | `false` | Parser diagnostic tracing |

#### Filter format

Each element in the `filters` array is one of:
- `"citeproc"` — built-in citation processor
- `"path/to/filter.lua"` — Lua filter (auto-detected by `.lua` extension)
- `{ "type": "json", "path": "path/to/filter" }` — explicit JSON filter
- `{ "type": "citeproc" }` — explicit citeproc

### General writer options

| defaults-file field | CLI flag | Type | Default | Description |
|---------------------|----------|------|---------|-------------|
| `standalone` | `--standalone` | boolean | `false` | Produce complete document with header/footer |
| `template` | `--template` | string \| null | null | Custom template file path |
| `variables` | `--variable` | object | `{}` | Template variables (key-value, always strings) |
| `eol` | `--eol` | `"crlf"` \| `"lf"` \| `"native"` | `"native"` | Line ending style |
| `dpi` | `--dpi` | integer | `96` | Pixels per inch |
| `wrap` | `--wrap` | `"auto"` \| `"none"` \| `"preserve"` | `"auto"` | Text wrapping mode |
| `columns` | `--columns` | integer | `72` | Line width for wrapping |
| `toc` | `--toc` | boolean | `false` | Include table of contents |
| `toc-depth` | `--toc-depth` | integer | `3` | TOC heading depth (1-6) |
| `strip-comments` | `--strip-comments` | boolean | `false` | Strip HTML comments |
| `syntax-highlighting` | `--syntax-highlighting` | string | `"default"` | `"none"` \| `"default"` \| `"idiomatic"` \| style name \| file path |
| `syntax-definitions` | `--syntax-definition` | string[] | `[]` | Custom syntax definition XML files |
| `include-in-header` | `--include-in-header` | string[] | `[]` | Files to include in document header |
| `include-before-body` | `--include-before-body` | string[] | `[]` | Files to include before body |
| `include-after-body` | `--include-after-body` | string[] | `[]` | Files to include after body |
| `resource-path` | `--resource-path` | string[] | `["."]` | Search paths for images/resources |
| `request-headers` | `--request-header` | `[string, string][]` | `[]` | HTTP headers for remote fetches |
| `no-check-certificate` | `--no-check-certificate` | boolean | `false` | Skip TLS certificate validation |

### Options affecting specific writers

| defaults-file field | CLI flag | Type | Default | Description |
|---------------------|----------|------|---------|-------------|
| `embed-resources` | `--embed-resources` | boolean | `false` | Inline CSS/JS in HTML output |
| `link-images` | `--link-images` | boolean | `false` | Link images in ODT instead of embedding |
| `html-q-tags` | `--html-q-tags` | boolean | `false` | Use `<q>` tags for quotes |
| `ascii` | `--ascii` | boolean | `false` | Prefer ASCII output |
| `reference-links` | `--reference-links` | boolean | `false` | Reference-style links in markdown/rst |
| `reference-location` | `--reference-location` | `"block"` \| `"section"` \| `"document"` | `"document"` | Where to place footnotes/references |
| `figure-caption-position` | `--figure-caption-position` | `"above"` \| `"below"` | `"below"` | Figure caption position |
| `table-caption-position` | `--table-caption-position` | `"above"` \| `"below"` | `"above"` | Table caption position |
| `markdown-headings` | `--markdown-headings` | `"setext"` \| `"atx"` | `"atx"` | Heading style for markdown output |
| `list-tables` | `--list-tables` | boolean | `false` | Use list tables in RST output |
| `top-level-division` | `--top-level-division` | `"default"` \| `"section"` \| `"chapter"` \| `"part"` | `"default"` | Top-level heading type |
| `number-sections` | `--number-sections` | boolean | `false` | Number section headings |
| `number-offset` | `--number-offset` | integer[] | `[0,0,0,0,0,0]` | Starting numbers for each heading level |
| `listings` | `--listings` | boolean | `false` | Use LaTeX listings package for code |
| `lof` | `--lof` | boolean | `false` | Include list of figures |
| `lot` | `--lot` | boolean | `false` | Include list of tables |
| `incremental` | `--incremental` | boolean | `false` | Incremental lists in slide shows |
| `slide-level` | `--slide-level` | integer \| null | null | Header level that creates slides (1-6) |
| `section-divs` | `--section-divs` | boolean | `false` | Wrap sections in `<div>` tags |
| `email-obfuscation` | `--email-obfuscation` | `"none"` \| `"javascript"` \| `"references"` | `"none"` | Email obfuscation method |
| `identifier-prefix` | `--id-prefix` | string | `""` | Prefix for HTML identifiers |
| `title-prefix` | `--title-prefix` | string | `""` | Prefix for HTML window title |
| `css` | `--css` | string[] | `[]` | CSS stylesheets |
| `reference-doc` | `--reference-doc` | string \| null | null | Reference document for docx/odt/pptx styling |
| `epub-cover-image` | `--epub-cover-image` | string \| null | null | EPUB cover image path |
| `epub-title-page` | `--epub-title-page` | boolean | `true` | Include EPUB title page |
| `epub-metadata` | `--epub-metadata` | string \| null | null | EPUB metadata file |
| `epub-fonts` | `--epub-embed-font` | string[] | `[]` | Font files to embed in EPUB |
| `split-level` | `--split-level` | integer | `1` | Header level for EPUB/chunked-HTML chapter splitting (1-6) |
| `chunk-template` | `--chunk-template` | string | `"%s-%i.html"` | Path template for chunk filenames |
| `epub-subdirectory` | `--epub-subdirectory` | string | `"EPUB"` | OCF container subdirectory |
| `ipynb-output` | `--ipynb-output` | `"all"` \| `"none"` \| `"best"` | `"best"` | Which cell outputs to include |
| `pdf-engine` | `--pdf-engine` | string | `"pdflatex"` | PDF generation engine |
| `pdf-engine-opts` | `--pdf-engine-opt` | string[] | `[]` | Additional PDF engine flags |

### Citation rendering

| defaults-file field | CLI flag | Type | Default | Description |
|---------------------|----------|------|---------|-------------|
| `citeproc` | `--citeproc` | boolean | `false` | Run built-in citeproc filter |
| `bibliography` | `--bibliography` | string \| string[] | `[]` | Bibliography file(s) |
| `csl` | `--csl` | string \| null | null | CSL citation style file |
| `citation-abbreviations` | `--citation-abbreviations` | string \| null | null | Citation abbreviations file |
| `cite-method` | `--natbib`/`--biblatex` | `"citeproc"` \| `"natbib"` \| `"biblatex"` | `"citeproc"` | Citation backend (LaTeX only) |

### Math rendering in HTML

| defaults-file field | CLI flag | Type | Default | Description |
|---------------------|----------|------|---------|-------------|
| `html-math-method` | `--mathjax`/`--katex`/etc | object | `{ "method": "plain" }` | Math rendering config |

The `html-math-method` object has two fields:
- `method`: `"plain"` \| `"mathjax"` \| `"katex"` \| `"mathml"` \| `"webtex"` \| `"gladtex"`
- `url`: string \| null — service URL (for mathjax, katex, webtex)

---

## Step 4: Extensions Reference

Extensions modify reader/writer behavior. Applied by appending `+ext` or `-ext` to the format string (e.g. `"markdown+emoji-smart"`). In the config, extensions are embedded in the `from`/`to` format string — not as a separate field.

However, the UI should present extensions as individual toggles and compose the format string before saving. The PandocConfigPanel should:

1. Parse the `from` value to extract base format and enabled/disabled extensions
2. Display extensions as tri-state toggles (default / on / off)
3. Compose the format string on save: `baseFormat + enabledExtensions - disabledExtensions`

### Extension list by category

**Typography**
- `smart` — curly quotes, em-dashes, ellipses

**Math**
- `tex_math_dollars` — `$...$` and `$$...$$`
- `tex_math_gfm` — GitHub math syntax
- `tex_math_single_backslash` — `\(...\)` and `\[...\]`
- `tex_math_double_backslash` — `\\(...\\)` and `\\[...\\]`
- `latex_macros` — parse `\newcommand` etc.

**Headings**
- `auto_identifiers` — auto-generate header IDs
- `ascii_identifiers` — ASCII-only header IDs
- `gfm_auto_identifiers` — GitHub-style header IDs
- `header_attributes` — `{#id .class key=value}` on headers
- `implicit_header_references` — headers create implicit reference links
- `blank_before_header` — require blank line before headers
- `space_in_atx_header` — require space after `#`

**Tables**
- `pipe_tables` — `| col | col |` syntax
- `simple_tables` — pandoc simple table syntax
- `multiline_tables` — pandoc multiline table syntax
- `grid_tables` — pandoc grid table syntax
- `table_captions` — table captions
- `table_attributes` — attributes after caption

**Lists**
- `fancy_lists` — letters, roman numerals, parentheses
- `startnum` — respect starting number of ordered lists
- `definition_lists` — definition list syntax
- `example_lists` — numbered example lists
- `task_lists` — GitHub-style checkboxes
- `four_space_rule` — 4-space indent for list continuation
- `lists_without_preceding_blankline` — no blank needed before list

**Inline formatting**
- `footnotes` — footnote syntax
- `inline_notes` — inline footnote syntax
- `citations` — native pandoc citations
- `strikeout` — `~~text~~`
- `superscript` — `^text^`
- `subscript` — `~text~`
- `short_subsuperscripts` — without closing delimiter
- `mark` — `==highlight==`
- `emoji` — `:smile:` codes
- `bracketed_spans` — `[text]{.class}`
- `fenced_divs` — `::: syntax`
- `link_attributes` — attributes on links/images
- `implicit_figures` — lone image becomes figure
- `intraword_underscores` — `_` inside words is literal

**Code blocks**
- `fenced_code_blocks` — `~~~` or `` ``` `` fenced code
- `backtick_code_blocks` — backtick fenced code
- `fenced_code_attributes` — attributes on fenced blocks
- `inline_code_attributes` — attributes on inline code

**Raw content**
- `raw_html` — allow raw HTML blocks/inlines
- `raw_tex` — allow raw LaTeX/TeX
- `raw_attribute` — explicit raw blocks/inlines with `{=format}`
- `raw_markdown` — raw markdown cells in ipynb
- `native_divs` — parse `<div>` as Div blocks
- `native_spans` — parse `<span>` as Span inlines
- `markdown_in_html_blocks` — markdown inside HTML blocks
- `markdown_attribute` — markdown in HTML with `markdown="1"`
- `empty_paragraphs` — allow empty paragraphs

**Metadata**
- `yaml_metadata_block` — YAML metadata at document start
- `pandoc_title_block` — `% Title` / `% Author` / `% Date`
- `mmd_title_block` — MultiMarkdown title block
- `mmd_header_identifiers` — MultiMarkdown `[id]` on headers
- `mmd_link_attributes` — MultiMarkdown link attributes

**Line handling**
- `hard_line_breaks` — all newlines become hard breaks
- `escaped_line_breaks` — backslash at EOL = hard break
- `ignore_line_breaks` — ignore newlines in paragraphs
- `east_asian_line_breaks` — ignore newlines between CJK characters
- `line_blocks` — `|` line block syntax

**Links & references**
- `autolink_bare_uris` — bare URLs become links
- `shortcut_reference_links` — `[foo]` shortcut refs
- `spaced_reference_links` — allow space in `[foo] [bar]`
- `wikilinks_title_after_pipe` — `[[target|title]]`
- `wikilinks_title_before_pipe` — `[[title|target]]`

**Misc**
- `all_symbols_escapable` — all non-alphanumerics escapable
- `angle_brackets_escapable` — `<` and `>` escapable
- `literate_haskell` — literate Haskell conventions
- `sourcepos` — include source position attributes
- `rebase_relative_paths` — rebase relative image/link paths
- `alerts` — GFM alert blocks
- `gutenberg` — Project Gutenberg conventions
- `attributes` — generic attribute syntax

**Format-specific**
- `styles` — (docx) parse custom styles as attributes
- `native_numbering` — (odt/docx) native figure/table numbering
- `element_citations` — (jats) use element-citation
- `ntb` — (context) Natural Tables
- `tagging` — (context) tagged PDF markup
- `amuse` — (muse) Text::Amuse extensions

---

## Step 5: PandocConfigPanel Rewrite

The existing `PandocConfigPanel.tsx` in `web/src/pages/settings/` needs to be verified/updated to match the defaults-file field names above. Key design decisions:

### Config jsonb structure

Use pandoc's **defaults-file field names with hyphens** as the jsonb keys. This matches the pandoc documentation exactly and means the config can be used directly as a pandoc defaults file if needed.

Example profile config:
```json
{
  "name": "Academic LaTeX",
  "description": "LaTeX with citations",
  "is_default": false,
  "from": "latex",
  "to": "json",
  "sandbox": true,
  "tab-stop": 4,
  "wrap": "none",
  "shift-heading-level-by": 0,
  "citeproc": true,
  "cite-method": "citeproc",
  "html-math-method": { "method": "mathjax" }
}
```

**Important:** The existing PandocConfigPanel.tsx and migration 076 use underscores (`tab_stop`, `cite_method`) instead of hyphens. **The worker must decide**: either use pandoc's native hyphenated names (matches docs, can serve as defaults file) or use underscored names (matches JavaScript conventions, matches docling pattern). Both are valid — but the decision must be consistent across migration, panel, and translation layer.

**Recommendation:** Use hyphenated names (pandoc's native format). The config is stored as jsonb and accessed via bracket notation anyway. This means a profile config can double as a pandoc defaults file with zero translation.

### UI sections

The panel should organize options into collapsible sections:

1. **General** — name, description, is_default, from, to, sandbox
2. **Reader** — tab-stop, shift-heading-level-by, default-image-extension, track-changes, preserve-tabs, strip-comments, file-scope
3. **Writer** — wrap, columns, standalone, eol, ascii
4. **Document Structure** — toc, toc-depth, number-sections, top-level-division, lof, lot, section-divs
5. **Markdown/RST Output** — markdown-headings, reference-links, reference-location, list-tables
6. **HTML Output** — html-math-method, syntax-highlighting, embed-resources, html-q-tags, email-obfuscation, id-prefix, dpi
7. **Citations** — citeproc, cite-method, csl, bibliography, citation-abbreviations
8. **EPUB** (show when from/to involves epub) — epub-cover-image, epub-title-page, epub-metadata, epub-fonts, epub-subdirectory, split-level
9. **PDF** (show when to=pdf) — pdf-engine, pdf-engine-opts
10. **Jupyter** (show when from/to involves ipynb) — ipynb-output
11. **Slides** (show when to involves slide format) — slide-level, incremental
12. **Extensions** — tri-state toggles grouped by category (Typography, Math, Headings, Tables, Lists, Inline, Code, Raw, Metadata, Lines, Links, Misc, Format-specific)

### Extension handling in the UI

Extensions are part of the format string (`"markdown+emoji-smart"`), but the UI should present them separately:

1. Store extensions in a separate `extensions` object in the config: `{ "smart": true, "emoji": true, "citations": false }`
2. The translation layer composes: `from` + extension toggles → full format string
3. `null` = use format default, `true` = force enable, `false` = force disable

This is the pattern already used in the draft PandocConfigPanel — keep it.

### Field components

Reuse the same field components from DoclingConfigPanel:
- `FieldRow` — label + description + control
- `Toggle` — boolean on/off
- `TriToggle` — null/true/false (for extensions)
- `Select` — dropdown
- `TextInput` — text field
- `NumberInput` — numeric field
- `Section` — collapsible section

---

## Step 6: Translation Layer (jsonb → pandoc CLI args)

The conversion service receives a config jsonb and must translate it to pandoc CLI arguments. This is a TypeScript function since pandoc is a binary.

### Key mapping rules

| jsonb field | CLI flag | Notes |
|-------------|----------|-------|
| `from` | `--from` | Append extension string from `extensions` object |
| `to` | `--to` | Same extension handling |
| `standalone` | `--standalone` | Only if true |
| `sandbox` | `--sandbox` | Only if true |
| `wrap` | `--wrap` | Only if not `"auto"` |
| `columns` | `--columns` | Only if not 72 |
| `tab-stop` | `--tab-stop` | Only if not 4 |
| `toc` | `--toc` | Only if true |
| `toc-depth` | `--toc-depth` | Only if not 3 |
| `shift-heading-level-by` | `--shift-heading-level-by` | Only if not 0 |
| `track-changes` | `--track-changes` | Only if not `"accept"` |
| `strip-comments` | `--strip-comments` | Only if true |
| `file-scope` | `--file-scope` | Only if true |
| `preserve-tabs` | `--preserve-tabs` | Only if true |
| `extract-media` | `--extract-media` | Only if set |
| `abbreviations` | `--abbreviations` | Only if set |
| `template` | `--template` | Only if set |
| `variables` | `--variable` | One per key-value pair |
| `metadata` | `--metadata` | One per key-value pair |
| `metadata-files` | `--metadata-file` | One per file |
| `filters` | `--filter`/`--lua-filter`/`--citeproc` | One per filter entry |
| `eol` | `--eol` | Only if not `"native"` |
| `dpi` | `--dpi` | Only if not 96 |
| `ascii` | `--ascii` | Only if true |
| `number-sections` | `--number-sections` | Only if true |
| `number-offset` | `--number-offset` | Comma-separated integers |
| `top-level-division` | `--top-level-division` | Only if not `"default"` |
| `section-divs` | `--section-divs` | Only if true |
| `incremental` | `--incremental` | Only if true |
| `slide-level` | `--slide-level` | Only if set |
| `reference-links` | `--reference-links` | Only if true |
| `reference-location` | `--reference-location` | Only if not `"document"` |
| `markdown-headings` | `--markdown-headings` | Only if not `"atx"` |
| `list-tables` | `--list-tables` | Only if true |
| `figure-caption-position` | `--figure-caption-position` | Only if not default |
| `table-caption-position` | `--table-caption-position` | Only if not default |
| `html-q-tags` | `--html-q-tags` | Only if true |
| `embed-resources` | `--embed-resources` | Only if true |
| `link-images` | `--link-images` | Only if true |
| `email-obfuscation` | `--email-obfuscation` | Only if not `"none"` |
| `identifier-prefix` | `--id-prefix` | Only if set |
| `title-prefix` | `--title-prefix` | Only if set |
| `syntax-highlighting` | `--syntax-highlighting` | Only if not `"default"` |
| `css` | `--css` | One per file |
| `reference-doc` | `--reference-doc` | Only if set |
| `include-in-header` | `--include-in-header` | One per file |
| `include-before-body` | `--include-before-body` | One per file |
| `include-after-body` | `--include-after-body` | One per file |
| `resource-path` | `--resource-path` | Colon-separated paths |
| `epub-cover-image` | `--epub-cover-image` | Only if set |
| `epub-title-page` | `--epub-title-page` | Only if false |
| `epub-metadata` | `--epub-metadata` | Only if set |
| `epub-fonts` | `--epub-embed-font` | One per font |
| `epub-subdirectory` | `--epub-subdirectory` | Only if not `"EPUB"` |
| `split-level` | `--split-level` | Only if not 1 |
| `chunk-template` | `--chunk-template` | Only if set |
| `ipynb-output` | `--ipynb-output` | Only if not `"best"` |
| `pdf-engine` | `--pdf-engine` | Only if set |
| `pdf-engine-opts` | `--pdf-engine-opt` | One per flag |
| `citeproc` | `--citeproc` | Only if true |
| `bibliography` | `--bibliography` | One per file |
| `csl` | `--csl` | Only if set |
| `citation-abbreviations` | `--citation-abbreviations` | Only if set |
| `cite-method` | `--natbib` or `--biblatex` | Only if not `"citeproc"` |
| `html-math-method.method` | `--mathjax`/`--katex`/etc | Method-specific flag |
| `html-math-method.url` | appended to method flag | e.g. `--mathjax=URL` |
| `request-headers` | `--request-header` | One per `[name, value]` pair |
| `no-check-certificate` | `--no-check-certificate` | Only if true |
| `lof` | `--lof` | Only if true |
| `lot` | `--lot` | Only if true |
| `fail-if-warnings` | `--fail-if-warnings` | Only if true |
| `verbosity` | `--verbose`/`--quiet` | `INFO` → `--verbose`, `ERROR` → `--quiet` |

---

## Step 7: Input/Output Format Enums (for dropdowns)

### Input formats (from pandoc 3.6 MANUAL.txt)

```
asciidoc, bibtex, biblatex, bits, commonmark, commonmark_x, creole,
csljson, csv, tsv, djot, docbook, docx, dokuwiki, endnotexml, epub,
fb2, gfm, haddock, html, ipynb, jats, jira, json, latex, man, mdoc,
markdown, markdown_mmd, markdown_phpextra, markdown_strict, mediawiki,
muse, native, odt, opml, org, pod, pptx, ris, rtf, rst, t2t, textile,
tikiwiki, twiki, typst, vimwiki, xlsx, xml
```

### Output formats (from pandoc 3.6 MANUAL.txt)

```
ansi, asciidoc, asciidoc_legacy, bbcode, bbcode_fluxbb, bbcode_phpbb,
bbcode_steam, bbcode_hubzilla, bbcode_xenforo, beamer, bibtex, biblatex,
chunkedhtml, commonmark, commonmark_x, context, csljson, djot, docbook,
docbook5, docx, dokuwiki, dzslides, epub, epub2, fb2, gfm, haddock,
html, html4, icml, ipynb, jats, jats_archiving, jats_articleauthoring,
jats_publishing, jira, json, latex, man, markdown, markdown_mmd,
markdown_phpextra, markdown_strict, markua, mediawiki, ms, muse,
native, odt, opendocument, opml, org, pdf, plain, pptx, revealjs,
rst, rtf, s5, slideous, slidy, tei, texinfo, textile, typst, vimdoc,
xml, xwiki, zimwiki
```

---

## Checklist

- [ ] Create `SuperuserParsersDocling.tsx` — thin wrapper importing DoclingConfigPanel
- [ ] Create `SuperuserParsersPandoc.tsx` — thin wrapper importing PandocConfigPanel
- [ ] Add router entries for both under `/app/superuser/`
- [ ] Remove `parsers-docling` from `settings-tabs.ts` CATEGORY_IDS and ADMIN_SUBTAB_GROUPS
- [ ] Remove `parsers-docling` from `SettingsAdmin.tsx` CATEGORIES array and conditional branch
- [ ] Remove DoclingConfigPanel import from SettingsAdmin.tsx
- [ ] Verify `nav-config.ts` has Parsers section in SUPERUSER_DRILL (already done)
- [ ] Decide hyphen vs underscore convention for pandoc jsonb keys
- [ ] If changing convention: update migration 076 seed data to match
- [ ] Update PandocConfigPanel.tsx to use chosen convention and cover all fields from this plan
- [ ] Test: superuser nav shows Parsers > Docling and Parsers > Pandoc
- [ ] Test: both panels load profiles from `parsing_profiles` table
- [ ] Test: editing and saving profiles works
- [ ] Test: creating and deleting profiles works
