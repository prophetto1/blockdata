import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const indexContent = readFileSync(new URL('../src/content/docs/index.mdx', import.meta.url), 'utf8');

assert.match(indexContent, /^title:\s*Getting Started/m, 'Root docs page should use the Getting Started title.');
assert.equal(
  /LinkButton|LinkCard/.test(indexContent),
  false,
  'Root docs page should not be a separate landing page with CTA links.'
);

console.log('PASS root docs page uses Getting Started content directly');
