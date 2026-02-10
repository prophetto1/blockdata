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
					label: 'Product',
					autogenerate: { directory: 'product' },
				},
				{
					label: 'Architecture',
					autogenerate: { directory: 'architecture' },
				},
				{
					label: 'Implementation',
					autogenerate: { directory: 'implementation' },
				},
				{
					label: 'Frontend',
					collapsed: true,
					autogenerate: { directory: 'frontend' },
				},
				{
					label: 'Platform Status',
					autogenerate: { directory: 'status' },
				},
				{
					label: 'Issues',
					collapsed: true,
					autogenerate: { directory: 'issues' },
				},
				{
					label: 'Infrastructure',
					collapsed: true,
					autogenerate: { directory: 'infrastructure' },
				},
			],
		}),
	],
});
