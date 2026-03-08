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

run('filetree shell no longer mounts a dedicated preview pane', () => {
  const contentShell = readFileSync(
    new URL('../src/components/DocsTwoColumnContent.astro', import.meta.url),
    'utf8'
  );
  const splitter = readFileSync(
    new URL('../src/components/WorkbenchSplitter.tsx', import.meta.url),
    'utf8'
  );

  assert.match(contentShell, /class="wa-preview"/);
  assert.doesNotMatch(contentShell, /function loadRepoPreviewIntoShell\(url\)/);
  assert.doesNotMatch(contentShell, /renderLocalMarkdown/);
  assert.doesNotMatch(contentShell, /DOMParser/);
  assert.doesNotMatch(contentShell, /shell-preview-refresh/);
  assert.doesNotMatch(splitter, /data-shell="splitter-preview"/);
  assert.doesNotMatch(splitter, /workbench-surface--preview/);
});
