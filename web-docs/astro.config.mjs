import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import remarkMath from 'remark-math';
import remarkEmoji from 'remark-emoji';
import rehypeKatex from 'rehype-katex';
import orama from '@orama/plugin-astro';
import { generateSidebar } from './src/lib/docs/generate-sidebar.mjs';

export default defineConfig({
  site: 'https://www.blockdata.run',
  adapter: vercel(),
  markdown: {
    remarkPlugins: [remarkMath, remarkEmoji],
    rehypePlugins: [rehypeKatex],
  },
  integrations: [
    react(),
    starlight({
      title: 'BlockData Docs',
      description: 'Documentation for the BlockData platform.',
      pagefind: false,
      components: {
        Header: './src/components/DocsHeader.astro',
        Sidebar: './src/components/DocsSidebar.astro',
        SiteTitle: './src/components/SiteTitle.astro',
        TwoColumnContent: './src/components/DocsTwoColumnContent.astro',
        ContentPanel: './src/components/DocsContentPanel.astro',
        PageTitle: './src/components/DocsPageTitle.astro',
        Search: './src/components/OramaSearch.astro',
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
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 2 },
      editLink: {
        baseUrl: 'https://github.com/prophetto1/blockdata-ct/edit/main/',
      },
      customCss: [
        'katex/dist/katex.min.css',
        './src/styles/global.css',
      ],
      sidebar: generateSidebar(),
    }),
    sitemap(),
    orama({
      docsearch: {
        pathMatcher: /.+/,
        contentSelectors: ['.sl-markdown-content'],
        language: 'english',
      },
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});

