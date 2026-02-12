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
						{ label: 'Runtime Policy', link: '/processing/runtime-policy/' },
						{ label: 'Admin Config Registry', link: '/processing/admin-config-registry/' },
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
						{ label: 'Source vs Destination', link: '/integrations/source-destination/' },
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
