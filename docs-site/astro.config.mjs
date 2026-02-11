// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightThemeBlack from 'starlight-theme-black';

export default defineConfig({
	base: '/docs',
	integrations: [
		starlight({
			title: 'BlockData',
			plugins: [starlightThemeBlack({
				footerText: '',
			})],
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
				{
					label: 'Getting Started',
					autogenerate: { directory: 'getting-started' },
				},
				{
					label: 'Projects',
					autogenerate: { directory: 'projects' },
				},
				{
					label: 'Blocks',
					autogenerate: { directory: 'blocks' },
				},
				{
					label: 'Schemas',
					autogenerate: { directory: 'schemas' },
				},
				{
					label: 'Processing',
					autogenerate: { directory: 'processing' },
				},
				{
					label: 'Review & Export',
					autogenerate: { directory: 'review-and-export' },
				},
				{
					label: 'Integrations',
					autogenerate: { directory: 'integrations' },
				},
				{
					label: 'Architecture',
					collapsed: true,
					autogenerate: { directory: 'architecture' },
				},
				{
					label: 'Status',
					collapsed: true,
					autogenerate: { directory: 'status' },
				},
			],
		}),
	],
});