import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const indexContent = readFileSync(new URL('../src/content/docs/index.mdx', import.meta.url), 'utf8');
const sidebarOrder = readFileSync(new URL('../src/lib/docs/sidebar-order.mjs', import.meta.url), 'utf8');
const starlightComponents = readFileSync(
  new URL('../src/content/docs/internal/style-guide/starlight-components.mdx', import.meta.url),
  'utf8'
);

assert.equal(
  existsSync(new URL('../src/content/docs/getting-started.md', import.meta.url)),
  false,
  'Standalone getting-started.md should be removed once root becomes the only entry page.'
);

assert.doesNotMatch(indexContent, /getting-started\.md|\/getting-started\//);
assert.doesNotMatch(sidebarOrder, /getting-started/);
assert.doesNotMatch(starlightComponents, /href="\/getting-started\/"/);

console.log('PASS docs entry page is rooted at / without a standalone getting-started page');
