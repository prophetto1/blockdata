// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
	base: '/docs',
	vite: {
		server: {
			fs: {
				allow: ['.'],
			},
		},
	},
	integrations: [
		starlight({
			title: 'BlockData',
			favicon: '/favicon.ico',
			logo: {
				dark: './src/assets/logo-dark.png',
				light: './src/assets/logo-light.png',
				replacesTitle: true,
			},
			customCss: [
				'@fontsource-variable/roboto-flex',
				'./src/styles/custom.css',
			],
			head: [
				{
					tag: 'script',
					content: `document.addEventListener('DOMContentLoaded',()=>{const a=document.querySelector('a.site-title');if(a)a.href='/';});`,
				},
			],
			sidebar: [
				{ label: 'Getting Started', autogenerate: { directory: 'getting-started' } },
				{
					label: 'End-to-End',
					collapsed: false,
					items: [
						{ label: 'Projects', autogenerate: { directory: 'projects' } },
						{ label: 'Documents', autogenerate: { directory: 'documents' } },
						{ label: 'Ingest & Conversion', autogenerate: { directory: 'ingest-and-conversion' } },
						{ label: 'Blocks', autogenerate: { directory: 'blocks' } },
						{ label: 'Schemas', autogenerate: { directory: 'schemas' } },
						{ label: 'Processing', autogenerate: { directory: 'processing' } },
						{ label: 'Review & Export', autogenerate: { directory: 'review-and-export' } },
						{ label: 'Integrations', autogenerate: { directory: 'integrations' } },
					],
				},
				{ label: 'Roadmap', autogenerate: { directory: 'ongoing-work' } },
				{
					label: 'Reference',
					collapsed: true,
					items: [
						{ label: 'Docs Policy', link: '/docs/docs-policy/' },
						{ label: 'Architecture', autogenerate: { directory: 'architecture' } },
						{ label: 'Status', autogenerate: { directory: 'status' } },
					],
				},
			],
		}),
	],
});
