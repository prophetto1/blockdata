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
  // Root-level files/directories shown in the docs sidebar.
  '.': {
    order: ['blockdata', 'docling-md-astro-preview', 'internal', 'plans'],
    hidden: ['index'],
  },

  internal: {
    label: 'Internal',
    order: ['docs-site-direction', 'shell-contract-spec', 'arango-local-dev', 'style-guide'],
  },

  'internal/style-guide': {
    label: 'Style Guide',
    order: [
      'starlight-components',
      'icon-unification',
      'toolbar-button-spec',
      'current-configs',
    ],
  },

  'internal/style-guide/current-configs': {
    label: 'Contracts',
    order: ['content', 'layout', 'fonts', 'colors', 'typography', 'global-css'],
  },
};
