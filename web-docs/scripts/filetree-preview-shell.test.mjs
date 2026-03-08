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

run('repo preview can refresh inside filetree shell without full-page navigation', () => {
  const contentShell = readFileSync(
    new URL('../src/components/DocsTwoColumnContent.astro', import.meta.url),
    'utf8'
  );
  const splitter = readFileSync(
    new URL('../src/components/WorkbenchSplitter.tsx', import.meta.url),
    'utf8'
  );

  assert.match(contentShell, /function loadRepoPreviewIntoShell\(url\)/);
  assert.match(contentShell, /let currentRepoPreviewUrl = new URL\(window\.location\.href\)/);
  assert.match(contentShell, /fetch\(url\.toString\(\),/);
  assert.match(contentShell, /DOMParser/);
  assert.match(contentShell, /loadRepoPreviewIntoShell\(currentRepoPreviewUrl\)/);
  assert.match(contentShell, /currentRepoPreviewUrl = next/);
  assert.doesNotMatch(contentShell, /history\.replaceState\(/);
  assert.match(contentShell, /loadRepoPreviewIntoShell\(next\)/);
  assert.match(splitter, /data-shell="splitter-preview"/);
});
