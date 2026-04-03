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
    order: ['blockdata', 'docling-md-astro-preview', 'internal', 'plans', 'assessments'],
    hidden: ['index'],
  },

  // AGChain docs are shown in the dedicated AGChain sidebar tab, not the main Sections view.
  agchain: {
    label: 'AGChain',
    order: ['platform', 'builders', 'benchmark', 'bridge', 'other'],
  },

  'agchain/platform': {
    label: 'Platform Features',
    order: ['general', 'runner', 'multi-tasks', 'prompts', 'statefulness', 'security'],
  },

  'agchain/builders': {
    label: 'Builders',
    order: ['eu-builders', 'benchmark-builders', 'payload'],
  },

  'agchain/benchmark': {
    label: 'Benchmark',
    order: ['legalchain', 'fdq'],
  },

  'agchain/benchmark/fdq': {
    label: 'FDQ',
  },

  'agchain/benchmark/legalchain': {
    label: 'Legal Chain',
    order: ['datasets', 'legal-10'],
  },

  'agchain/benchmark/legalchain/legal-10': {
    label: 'Legal-10',
    order: ['fdq'],
  },

  'agchain/bridge': {
    label: 'Bridge',
  },

  'agchain/other': {
    label: 'Other',
  },

  internal: {
    label: 'Internal',
    order: ['docs-site-direction', 'shell-contract-spec', 'arango-cloud', 'gcp-benchmark-access', 'style-guide'],
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
