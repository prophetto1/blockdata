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
				{
					label: 'Getting Started',
					items: [
						{ label: 'Overview', link: '/getting-started/' },
						{ label: 'Projects', link: '/projects/' },
					],
				},
				{
					label: 'Core Workflow',
					items: [
						{ label: 'Documents', link: '/documents/' },
						{ label: 'Ingest & Conversion', link: '/ingest-and-conversion/' },
						{ label: 'Processing', link: '/processing/' },
						{ label: 'Worker Protocol', link: '/processing/worker-protocol/' },
						{ label: 'Review & Export', link: '/review-and-export/' },
						{ label: 'Overlay Contract', link: '/review-and-export/overlay-contract/' },
					],
				},
				{
					label: 'Key Concepts',
					items: [
						{
							label: 'Blocks',
							items: [
								{ label: 'Overview', link: '/blocks/' },
								{ label: 'Block Types', link: '/blocks/block-types/' },
								{ label: 'Parsing Tracks', link: '/blocks/parsing-tracks/' },
							],
						},
						{ label: 'Schemas', link: '/schemas/' },
						{ label: 'Immutable Fields', link: '/schemas/immutable-schema/' },
						{ label: 'User-Defined Schemas', link: '/schemas/user-defined-schemas/' },
						{ label: 'Canonical Export', link: '/architecture/canonical-export/' },
					],
				},
				{
					label: 'Integrations',
					items: [
						{ label: 'Overview', link: '/integrations/' },
						{ label: 'Zvec Contract', link: '/integrations/zvec-contract/' },
						{ label: 'Zvec Adapters', link: '/integrations/zvec-adapters-and-transformers/' },
					],
				},
				{
					label: 'Roadmap',
					collapsed: true,
					items: [
						{ label: 'Ongoing Work', link: '/ongoing-work/' },
						{ label: 'Architecture', link: '/architecture/' },
						{ label: 'Status', link: '/status/' },
						{ label: 'Docs Policy', link: '/docs-policy/' },
					],
				},
			],
		}),
	],
});
