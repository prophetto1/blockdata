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
				'@fontsource-variable/inter',
				'./src/styles/custom.css',
			],
			sidebar: [
				{
					label: 'Back to BlockData',
					link: '/',
					attrs: { style: 'font-weight:600;opacity:0.7' },
				},
				{ label: 'Getting Started', autogenerate: { directory: 'getting-started' } },
				{
					label: 'Core Concepts',
					collapsed: true,
					items: [
						{ label: 'Projects', autogenerate: { directory: 'projects' } },
						{ label: 'Blocks', autogenerate: { directory: 'blocks' } },
						{ label: 'Schemas', autogenerate: { directory: 'schemas' } },
					],
				},
				{
					label: 'Workflow',
					collapsed: true,
					items: [
						{ label: 'Processing', autogenerate: { directory: 'processing' } },
						{ label: 'Review & Export', autogenerate: { directory: 'review-and-export' } },
						{ label: 'Integrations', autogenerate: { directory: 'integrations' } },
					],
				},
				{
					label: 'Reference',
					collapsed: true,
					items: [
						{ label: 'Architecture', autogenerate: { directory: 'architecture' } },
						{ label: 'Status', autogenerate: { directory: 'status' } },
					],
				},
			],
		}),
	],
});
