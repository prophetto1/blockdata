import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const astroConfig = readFileSync(new URL('../astro.config.mjs', import.meta.url), 'utf8');
const docsPageTitle = readFileSync(
  new URL('../src/components/DocsPageTitle.astro', import.meta.url),
  'utf8',
);
const docsContentPanel = readFileSync(
  new URL('../src/components/DocsContentPanel.astro', import.meta.url),
  'utf8',
);

run('normal docs view suppresses shell title when content already begins with h1', () => {
  assert.match(astroConfig, /PageTitle:\s*'\.\/src\/components\/DocsPageTitle\.astro'/);
  assert.match(astroConfig, /ContentPanel:\s*'\.\/src\/components\/DocsContentPanel\.astro'/);

  assert.match(docsPageTitle, /const firstHeading = headings\[0\];/);
  assert.match(docsPageTitle, /const suppressShellTitle = firstHeading\?\.depth === 1;/);
  assert.match(docsPageTitle, /id="_top"/);
  assert.match(docsPageTitle, /data-page-title-suppressed/);

  assert.match(docsContentPanel, /\.content-panel:first-of-type:has\(\.sl-page-title-anchor:only-child\)/);
  assert.match(docsContentPanel, /padding:\s*0;/);
  assert.match(docsContentPanel, /border-top:\s*0;/);
});
