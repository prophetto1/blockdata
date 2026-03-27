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
					label: 'Platform',
					collapsed: true,
					autogenerate: { directory: 'platform' },
				},
				{
					label: 'Build Pipeline',
					collapsed: true,
					autogenerate: { directory: 'pipeline' },
				},
				{
					label: 'Benchmarks',
					autogenerate: { directory: 'benchmarks' },
				},
				{
					label: 'Project',
					collapsed: true,
					autogenerate: { directory: 'project' },
				},
			],
		}),
	],
});
