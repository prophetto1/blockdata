import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const astroConfig = readFileSync(new URL('../astro.config.mjs', import.meta.url), 'utf8');

assert.equal(
  astroConfig.includes("base: '/docs'"),
  false,
  'Astro config still hardcodes base: \'/docs\'.'
);

console.log('PASS Astro config does not hardcode base: /docs');
