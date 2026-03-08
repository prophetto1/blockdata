/**
 * Sidebar ordering and label overrides.
 *
 * Keys are directory paths relative to src/content/docs/.
 * Each entry can specify:
 *   - order: array of filenames (without extension) or directory names
 *             Items not listed sort alphabetically after the listed ones.
 *   - label: display name override for this directory in the sidebar
 *             (defaults to title-cased directory name)
 *   - hidden: array of filenames/dirs to exclude from the sidebar
 *
 * Top-level files (like index) are handled separately.
 */

export default {
  // Root-level directories — order controls top-level sidebar groups
  '.': {
    order: ['internal'],
    hidden: ['index', 'assessments', 'backend', 'proposed', 'reference', 'proposals', 'infrastructure'],
  },

  'internal': {
    label: 'Internal',
    order: ['docs-site-direction', 'local-urls', 'style-guide', 'analysis'],
  },

  'internal/style-guide': {
    label: 'Style Guide',
    order: [
      'starlight-components',
      'markdown-syntax',
      'icon-unification',
      'toolbar-button-spec',
      'font-standardization',
      'integrations',
      'current-configs',
    ],
  },

  'internal/style-guide/integrations': {
    label: 'Integrations',
    order: ['keystatic'],
  },

  'internal/style-guide/current-configs': {
    label: 'Contracts',
    order: ['content', 'layout', 'fonts', 'colors', 'typography', 'global-css'],
  },

  'internal/analysis': {
    label: 'Analysis',
    order: ['kestra', 'ai'],
  },

  'internal/analysis/kestra': {
    label: 'Kestra',
    order: ['python-handlers', 'sql-tables'],
  },

  'internal/analysis/ai': {
    label: 'AI',
    order: ['overview', 'integrations-marketplace-chat-pane'],
  },
};
