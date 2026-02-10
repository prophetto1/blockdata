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
					label: 'Concepts',
					autogenerate: { directory: 'concepts' },
				},
				{
					label: 'Workflows',
					autogenerate: { directory: 'workflows' },
				},
				{
					label: 'Reference',
					autogenerate: { directory: 'reference' },
				},
				{
					label: 'Architecture',
					autogenerate: { directory: 'architecture' },
				},
				{
					label: 'Integrations',
					autogenerate: { directory: 'integrations' },
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
