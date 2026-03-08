import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const indexContent = readFileSync(new URL('../src/content/docs/index.mdx', import.meta.url), 'utf8');

assert.equal(
  /http-equiv:\s*refresh/i.test(indexContent),
  false,
  'Root docs page should not use a meta refresh redirect.'
);

console.log('PASS root docs page does not use a meta refresh redirect');
