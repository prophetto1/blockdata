import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://docs.blockdata.dev',
  integrations: [
    starlight({
      title: 'BlockData Docs',
      description: 'Documentation for the BlockData platform.',
      favicon: '/favicon.svg',
      lastUpdated: true,
      pagination: true,
      credits: true,
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      editLink: {
        baseUrl: 'https://github.com/blockdata/writing-system/edit/master/web-docs/',
      },
      customCss: ['./src/styles/global.css'],
      sidebar: [
        { slug: 'getting-started' },
      ],
    }),
    sitemap(),
  ],
  vite: { plugins: [tailwindcss()] },
});
