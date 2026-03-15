import assert from 'node:assert/strict';
import { generateSidebar } from '../src/lib/docs/generate-sidebar.mjs';

function findGroup(items, label) {
  return items.find((item) => item.label === label);
}

function findLink(items, slug) {
  return items.find((item) => item.slug === slug);
}

const sidebar = generateSidebar();

assert.ok(Array.isArray(sidebar), 'generateSidebar() should return an array');
assert.ok(sidebar.length > 0, 'generateSidebar() should return at least one item');

const internal = findGroup(sidebar, 'Internal');
assert.ok(internal, 'Expected an Internal group in the sections sidebar');

for (const slug of [
  'internal/docs-site-direction',
  'internal/shell-contract-spec',
  'internal/arango-cloud',
]) {
  assert.ok(
    findLink(internal.items ?? [], slug),
    `Expected Internal to contain a direct link for "${slug}"`
  );
}

const styleGuide = findGroup(internal.items ?? [], 'Style Guide');
assert.ok(styleGuide, 'Expected a Style Guide group under Internal');

for (const slug of [
  'internal/style-guide/starlight-components',
  'internal/style-guide/icon-unification',
  'internal/style-guide/toolbar-button-spec',
  'internal/style-guide/current-configs/content',
  'internal/style-guide/current-configs/layout',
  'internal/style-guide/current-configs/fonts',
  'internal/style-guide/current-configs/colors',
  'internal/style-guide/current-configs/typography',
  'internal/style-guide/current-configs/global-css',
]) {
  assert.ok(
    findLink(styleGuide.items ?? [], slug),
    `Expected Style Guide to contain a direct link for "${slug}"`
  );
}

assert.equal(
  styleGuide.items?.some((item) => 'items' in item),
  false,
  'Style Guide should not contain nested directory groups in the sections sidebar'
);

console.log('PASS sections sidebar flattens directory-only groups under Style Guide');
