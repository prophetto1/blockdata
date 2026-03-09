/**
 * Curated Starlight sidebar for the Sections view.
 *
 * The file tree mode reflects the docs directory structure directly.
 * The sections mode should remain a curated navigation model instead.
 */

const sectionsSidebar = [
  { slug: 'blockdata' },
  {
    label: 'Internal',
    items: [
      { slug: 'internal/docs-site-direction' },
      { slug: 'internal/shell-contract-spec' },
      {
        label: 'Style Guide',
        items: [
          { slug: 'internal/style-guide/starlight-components' },
          { slug: 'internal/style-guide/icon-unification' },
          { slug: 'internal/style-guide/toolbar-button-spec' },
          { slug: 'internal/style-guide/current-configs/content' },
          { slug: 'internal/style-guide/current-configs/layout' },
          { slug: 'internal/style-guide/current-configs/fonts' },
          { slug: 'internal/style-guide/current-configs/colors' },
          { slug: 'internal/style-guide/current-configs/typography' },
          { slug: 'internal/style-guide/current-configs/global-css' },
        ],
      },
    ],
  },
];

export function generateSidebar() {
  return sectionsSidebar;
}
