// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
	base: '/',
	integrations: [
		starlight({
			title: 'AgChain',
			customCss: [
				'@fontsource-variable/open-sans',
				'./src/styles/custom.css',
			],
			sidebar: [
				{
					label: 'Platform Features',
					autogenerate: { directory: 'platform' },
				},
				{
					label: 'Builders',
					autogenerate: { directory: 'builders' },
				},
				{
					label: 'Benchmark',
					autogenerate: { directory: 'benchmark' },
				},
				{
					label: 'Bridge',
					autogenerate: { directory: 'bridge' },
				},
				{
					label: 'Other',
					collapsed: true,
					autogenerate: { directory: 'other' },
				},
			],
		}),
	],
});
