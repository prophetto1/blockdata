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
			components: {
				Header: './src/components/Header.astro',
			},
			logo: {
				dark: './src/assets/logo-dark.png',
				light: './src/assets/logo-light.png',
				replacesTitle: true,
			},
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/prophetto1/blockdata',
				},
			],
			customCss: [
				'@fontsource-variable/roboto-flex',
				'./src/styles/custom.css',
			],
			head: [
				{
					tag: 'script',
					content: `document.addEventListener('DOMContentLoaded',()=>{const a=document.querySelector('a.site-title');if(a)a.href='/';});`,
				},
				{
					tag: 'script',
					attrs: {
						src: 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js',
					},
				},
				{
					tag: 'script',
					content: `document.addEventListener('DOMContentLoaded',()=>{if(!window.mermaid)return;const isLight=document.documentElement.dataset.theme==='light';window.mermaid.initialize({startOnLoad:false,theme:isLight?'default':'dark'});document.querySelectorAll('pre > code.language-mermaid').forEach(code=>{const pre=code.parentElement;if(!pre)return;const div=document.createElement('div');div.className='mermaid';div.textContent=code.textContent||'';pre.replaceWith(div);});window.mermaid.run({querySelector:'.mermaid'});});`,
				},
			],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Overview', link: '/getting-started/' },
						{ label: 'Projects', link: '/getting-started/projects/' },
					],
				},
				{
					label: 'Core Workflow',
					items: [
						{ label: 'Documents', link: '/core-workflow/documents/' },
						{ label: 'Ingest & Conversion', link: '/core-workflow/ingest-and-conversion/' },
						{ label: 'Ingest Pipeline (MD + DOCX)', link: '/core-workflow/processing/ingest-pipeline/' },
						{ label: 'Processing', link: '/core-workflow/processing/' },
						{ label: 'Worker Protocol', link: '/core-workflow/processing/worker-protocol/' },
						{ label: 'Runtime Policy', link: '/core-workflow/processing/runtime-policy/' },
						{ label: 'Admin Config Registry', link: '/core-workflow/processing/admin-config-registry/' },
						{ label: 'Review & Export', link: '/core-workflow/review-and-export/' },
						{ label: 'Overlay Contract', link: '/core-workflow/review-and-export/overlay-contract/' },
					],
				},
				{
					label: 'Key Concepts',
					items: [
						{
							label: 'Blocks',
							items: [
								{ label: 'Overview', link: '/key-concepts/blocks/' },
								{ label: 'Block Types', link: '/key-concepts/blocks/block-types/' },
								{ label: 'Parsing Tracks', link: '/key-concepts/blocks/parsing-tracks/' },
							],
						},
						{ label: 'Schemas', link: '/key-concepts/schemas/' },
						{ label: 'Immutable Fields', link: '/key-concepts/schemas/immutable-schema/' },
						{ label: 'User-Defined Schemas', link: '/key-concepts/schemas/user-defined-schemas/' },
						{ label: 'Canonical Export', link: '/key-concepts/architecture/canonical-export/' },
					],
				},
				{
					label: 'Integrations',
					items: [
						{ label: 'Overview', link: '/integrations/' },
						{ label: 'Source vs Destination', link: '/integrations/source-destination/' },
						{ label: 'Zvec Contract', link: '/integrations/zvec-contract/' },
						{ label: 'Zvec Adapters', link: '/integrations/zvec-adapters-and-transformers/' },
					],
				},
				{
					label: 'Roadmap',
					collapsed: true,
					items: [
						{ label: 'Ongoing Work', link: '/roadmap/ongoing-work/' },
						{ label: 'Architecture', link: '/roadmap/architecture/' },
						{ label: 'Status', link: '/roadmap/status/' },
						{ label: 'Docs Policy', link: '/roadmap/docs-policy/' },
					],
				},
			],
		}),
	],
});
