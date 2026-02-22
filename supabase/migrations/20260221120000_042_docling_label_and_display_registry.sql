-- =============================================================================
-- Migration 042: Docling Label & Display Registry
-- =============================================================================
-- Date:    2026-02-21
-- Purpose: Create DB-level single source of truth for block-type display
--          properties (badge colors, overlay colors, native Docling label
--          mappings). Replaces hardcoded frontend maps in BlockViewerGrid.tsx,
--          PdfResultsHighlighter.tsx, and theme.css.
--
-- Tables created:
--   - docling_label_catalog   (23 rows — one per DocItemLabel)
--   - docling_group_label_catalog (12 rows — one per GroupLabel)
--
-- Columns added:
--   - block_type_catalog.badge_color (text, nullable)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ADD badge_color TO block_type_catalog
-- ---------------------------------------------------------------------------

ALTER TABLE block_type_catalog
  ADD COLUMN IF NOT EXISTS badge_color text;

COMMENT ON COLUMN block_type_catalog.badge_color IS
  'Mantine color name for grid badge display (e.g. blue, gray, teal)';

UPDATE block_type_catalog SET badge_color = v.badge_color
FROM (VALUES
  ('heading',          'blue'),
  ('paragraph',        'gray'),
  ('list_item',        'teal'),
  ('code_block',       'violet'),
  ('table',            'orange'),
  ('figure',           'pink'),
  ('caption',          'grape'),
  ('footnote',         'cyan'),
  ('divider',          'dark'),
  ('html_block',       'red'),
  ('definition',       'indigo'),
  ('checkbox',         'lime'),
  ('form_region',      'yellow'),
  ('key_value_region', 'green'),
  ('page_header',      'dark'),
  ('page_footer',      'dark'),
  ('other',            'gray')
) AS v(block_type, badge_color)
WHERE block_type_catalog.block_type = v.block_type;

-- ---------------------------------------------------------------------------
-- 2. CREATE docling_label_catalog
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS docling_label_catalog (
  label                text PRIMARY KEY,
  platform_block_type  text NOT NULL REFERENCES block_type_catalog(block_type),
  description          text,
  badge_color          text,
  overlay_border_color text,
  overlay_bg_color     text,
  sort_order           integer NOT NULL DEFAULT 0
);

COMMENT ON TABLE docling_label_catalog IS
  'Registry of all 23 Docling DocItemLabel values with their platform mapping and display properties. Single source of truth — frontend reads from here.';
COMMENT ON COLUMN docling_label_catalog.label IS
  'Native Docling DocItemLabel enum value (e.g. section_header, paragraph, picture)';
COMMENT ON COLUMN docling_label_catalog.platform_block_type IS
  'Mapped platform block_type (FK). Mirrors mapDoclingLabel() logic.';
COMMENT ON COLUMN docling_label_catalog.badge_color IS
  'Mantine color name for grid badge. Can differ from platform default for finer distinction.';
COMMENT ON COLUMN docling_label_catalog.overlay_border_color IS
  'Hex color for PDF overlay border (e.g. #0ea5e9)';
COMMENT ON COLUMN docling_label_catalog.overlay_bg_color IS
  'RGBA string for PDF overlay background (e.g. rgba(14,165,233,0.14))';

-- RLS
ALTER TABLE docling_label_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "docling_label_catalog_select"
  ON docling_label_catalog FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "docling_label_catalog_service_role"
  ON docling_label_catalog FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed 23 DocItemLabels
-- Overlay colors: each native label gets a distinct color pair.
-- Colors chosen to be visually distinguishable on white/dark PDF backgrounds.
INSERT INTO docling_label_catalog (label, platform_block_type, description, badge_color, overlay_border_color, overlay_bg_color, sort_order)
VALUES
  -- Heading family
  ('title',                'heading',          'Document title',                          'blue',    '#2563eb', 'rgba(37,99,235,0.14)',   1),
  ('section_header',       'heading',          'Section heading',                         'blue',    '#0ea5e9', 'rgba(14,165,233,0.14)',   2),
  -- Body text
  ('paragraph',            'paragraph',        'Body paragraph',                          'gray',    '#38bdf8', 'rgba(56,189,248,0.14)',   3),
  ('text',                 'paragraph',        'Generic text element',                    'gray',    '#7dd3fc', 'rgba(125,211,252,0.14)',  4),
  -- Lists
  ('list_item',            'list_item',        'List item (ordered or unordered)',         'teal',    '#eab308', 'rgba(234,179,8,0.18)',    5),
  -- Code
  ('code',                 'code_block',       'Code block or inline code',               'violet',  '#a78bfa', 'rgba(167,139,250,0.16)',  6),
  -- Tables
  ('table',                'table',            'Table element',                           'orange',  '#f472b6', 'rgba(244,114,182,0.16)',  7),
  ('document_index',       'table',            'Table of contents or index',              'orange',  '#fb923c', 'rgba(251,146,60,0.16)',   8),
  -- Figures
  ('picture',              'figure',           'Image or illustration',                   'pink',    '#f9a8d4', 'rgba(249,168,212,0.16)',  9),
  ('chart',                'figure',           'Chart or graph visualization',            'pink',    '#e879f9', 'rgba(232,121,249,0.16)', 10),
  -- Captions
  ('caption',              'caption',          'Figure or table caption',                 'grape',   '#fb7185', 'rgba(251,113,133,0.16)', 11),
  -- Footnotes
  ('footnote',             'footnote',         'Footnote or endnote',                     'cyan',    '#22d3ee', 'rgba(34,211,238,0.14)',  12),
  -- Math
  ('formula',              'other',            'Mathematical formula or equation',        'yellow',  '#fbbf24', 'rgba(251,191,36,0.16)',  13),
  -- Page furniture
  ('page_header',          'page_header',      'Running header',                          'dark',    '#f59e0b', 'rgba(245,158,11,0.16)',  14),
  ('page_footer',          'page_footer',      'Running footer',                          'dark',    '#d97706', 'rgba(217,119,6,0.16)',   15),
  -- Checkboxes
  ('checkbox_selected',    'checkbox',         'Checked checkbox',                        'lime',    '#84cc16', 'rgba(132,204,22,0.16)',  16),
  ('checkbox_unselected',  'checkbox',         'Unchecked checkbox',                      'lime',    '#a3e635', 'rgba(163,230,53,0.16)',  17),
  -- Forms
  ('form',                 'form_region',      'Form region',                             'yellow',  '#94a3b8', 'rgba(148,163,184,0.14)', 18),
  ('key_value_region',     'key_value_region',  'Key-value pair region',                   'green',   '#64748b', 'rgba(100,116,139,0.14)', 19),
  -- Rare / specialized
  ('reference',            'other',            'Bibliographic reference',                 'indigo',  '#818cf8', 'rgba(129,140,248,0.14)', 20),
  ('empty_value',          'other',            'Empty or whitespace-only element',        'gray',    '#cbd5e1', 'rgba(203,213,225,0.10)', 21),
  ('grading_scale',        'other',            'Grading scale element',                   'gray',    '#a1a1aa', 'rgba(161,161,170,0.12)', 22),
  ('handwritten_text',     'other',            'Handwritten text (OCR)',                  'gray',    '#78716c', 'rgba(120,113,108,0.14)', 23)
ON CONFLICT (label) DO UPDATE SET
  platform_block_type  = EXCLUDED.platform_block_type,
  description          = EXCLUDED.description,
  badge_color          = EXCLUDED.badge_color,
  overlay_border_color = EXCLUDED.overlay_border_color,
  overlay_bg_color     = EXCLUDED.overlay_bg_color,
  sort_order           = EXCLUDED.sort_order;

-- ---------------------------------------------------------------------------
-- 3. CREATE docling_group_label_catalog
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS docling_group_label_catalog (
  group_label  text PRIMARY KEY,
  description  text,
  sort_order   integer NOT NULL DEFAULT 0
);

COMMENT ON TABLE docling_group_label_catalog IS
  'Registry of all 12 Docling GroupLabel values. Used when raw_group_type is persisted on blocks.';

-- RLS
ALTER TABLE docling_group_label_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "docling_group_label_catalog_select"
  ON docling_group_label_catalog FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "docling_group_label_catalog_service_role"
  ON docling_group_label_catalog FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed 12 GroupLabels
INSERT INTO docling_group_label_catalog (group_label, description, sort_order)
VALUES
  ('chapter',         'Document chapter',                    1),
  ('section',         'Document section',                    2),
  ('list',            'Unordered list container',            3),
  ('ordered_list',    'Ordered list container',              4),
  ('inline',          'Inline grouping',                     5),
  ('picture_area',    'Picture with surrounding elements',   6),
  ('key_value_area',  'Key-value pair grouping',             7),
  ('form_area',       'Form region grouping',                8),
  ('comment_section', 'Comment or annotation section',       9),
  ('sheet',           'Spreadsheet sheet',                  10),
  ('slide',           'Presentation slide',                 11),
  ('unspecified',     'Unspecified grouping',               12)
ON CONFLICT (group_label) DO UPDATE SET
  description = EXCLUDED.description,
  sort_order  = EXCLUDED.sort_order;

-- ---------------------------------------------------------------------------
-- 4. NOTIFY POSTGREST
-- ---------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
