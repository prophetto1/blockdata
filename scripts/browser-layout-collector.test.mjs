import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

test('browser layout collector derives a bounded slug for long URLs', () => {
  const { deriveCaptureSlug } = require('./browser-layout-collector.js');

  const url = `https://braintrust.dev/app/org-level/p/project-level?foo=${'x'.repeat(220)}`;
  const slug = deriveCaptureSlug(url);

  assert.equal(slug.length <= 120, true);
  assert.equal(slug.startsWith('braintrust-dev-app-org-level-p-project-level'), true);
});

test('browser layout collector generates a json download filename', () => {
  const { deriveDownloadFilename } = require('./browser-layout-collector.js');

  const filename = deriveDownloadFilename({
    url: 'https://braintrust.dev/app/org-level/p/project-level',
    capturedAt: '2026-03-28T18:45:00.000Z',
  });

  assert.equal(filename.endsWith('.json'), true);
  assert.equal(filename.includes('braintrust-dev-app-org-level-p-project-level'), true);
  assert.equal(filename.includes('2026-03-28T18-45-00-000Z'), true);
});
