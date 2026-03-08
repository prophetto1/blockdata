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

const configSource = readFileSync(new URL('../keystatic.config.ts', import.meta.url), 'utf8');

run('keystatic config removes the repo-wide Markdown and MDX buckets', () => {
  assert.doesNotMatch(configSource, /docsMarkdown:\s*collection\(/);
  assert.doesNotMatch(configSource, /docsMdx:\s*collection\(/);
});

run('keystatic config defines a site singleton for the docs home page', () => {
  assert.match(configSource, /import\s+\{\s*collection,\s*config,\s*fields,\s*singleton\s*\}\s+from '@keystatic\/core';/);
  assert.match(configSource, /siteHome:\s*singleton\(/);
  assert.match(configSource, /path:\s*'src\/content\/docs\/index\.mdx'/);
  assert.doesNotMatch(configSource, /gettingStarted:\s*singleton\(/);
  assert.doesNotMatch(configSource, /src\/content\/docs\/getting-started\.md/);
});

run('keystatic config defines concern-based collections', () => {
  assert.match(configSource, /referenceMarkdown:\s*collection\(/);
  assert.match(configSource, /referenceMdx:\s*collection\(/);
  assert.match(configSource, /infrastructureDocs:\s*collection\(/);
  assert.match(configSource, /internalDocs:\s*collection\(/);
  assert.match(configSource, /proposedDocs:\s*collection\(/);
  assert.match(configSource, /assessmentsMarkdown:\s*collection\(/);
  assert.match(configSource, /assessmentsMdx:\s*collection\(/);
  assert.match(configSource, /proposals:\s*collection\(/);
});

run('keystatic config groups editor navigation by concern', () => {
  assert.match(configSource, /navigation:\s*\{/);
  assert.match(configSource, /Site:\s*\[/);
  assert.match(configSource, /Published Docs:\s*\[/);
  assert.match(configSource, /Editorial Workflow:\s*\[/);
});
