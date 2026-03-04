import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import remarkMath from 'remark-math';
import remarkEmoji from 'remark-emoji';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  site: 'https://docs.blockdata.dev',
  markdown: {
    remarkPlugins: [remarkMath, remarkEmoji],
    rehypePlugins: [rehypeKatex],
  },
  integrations: [
    starlight({
      title: 'BlockData Docs',
      description: 'Documentation for the BlockData platform.',
      components: {
        SiteTitle: './src/components/SiteTitle.astro',
      },
      favicon: '/favicon.svg',
      lastUpdated: true,
      pagination: true,
      credits: true,
      head: [
        {
          tag: 'script',
          content: `
            try {
              const key = 'starlight-theme';
              if (localStorage.getItem(key) === null) {
                localStorage.setItem(key, 'dark');
              }
              const theme = localStorage.getItem(key);
              document.documentElement.dataset.theme = theme === 'light' ? 'light' : 'dark';
            } catch {}
          `,
        },
      ],
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      editLink: {
        baseUrl: 'https://github.com/blockdata/writing-system/edit/master/web-docs/',
      },
      customCss: [
        'katex/dist/katex.min.css',
        './src/styles/global.css',
      ],
      sidebar: [
        { slug: 'getting-started' },
        {
          label: 'Reference',
          items: [
            { slug: 'reference/starlight-components' },
            { slug: 'reference/markdown-syntax' },
          ],
        },
        {
          label: 'Internal',
          items: [
            { slug: 'internal/local-urls' },
            { slug: 'internal/icon-unification' },
            { slug: 'internal/toolbar-button-spec' },
            { slug: 'internal/font-standardization' },
            { slug: 'internal/requirements' },
          ],
        },
      ],
    }),
    sitemap(),
  ],
  vite: { plugins: [tailwindcss()] },
});
