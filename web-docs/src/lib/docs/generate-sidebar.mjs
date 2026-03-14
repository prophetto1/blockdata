import { readdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';

import sidebarOrder from './sidebar-order.mjs';

const DOCS_ROOT = resolve(process.cwd(), 'src/content/docs');
const DOC_EXTENSIONS = new Set(['.md', '.mdx']);

function normalizePath(value) {
  return value.replace(/\\/g, '/');
}

function stripExtension(value) {
  return value.replace(/\.[^.]+$/, '');
}

function toSlug(relativePath) {
  let slug = stripExtension(normalizePath(relativePath));

  if (slug === 'index') return null;
  if (slug.endsWith('/index')) {
    slug = slug.slice(0, -'/index'.length);
  }

  return slug;
}

function toLabel(value) {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getOrderConfig(relativeDir) {
  return sidebarOrder[relativeDir || '.'] ?? {};
}

function isHiddenEntry(entryName, hiddenNames) {
  const entryBaseName = stripExtension(entryName);
  return hiddenNames.has(entryName) || hiddenNames.has(entryBaseName);
}

function compareByConfiguredOrder(leftName, rightName, orderedNames) {
  const leftIndex = orderedNames.indexOf(stripExtension(leftName));
  const rightIndex = orderedNames.indexOf(stripExtension(rightName));
  const leftRank = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
  const rightRank = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;

  if (leftRank !== rightRank) return leftRank - rightRank;
  return leftName.localeCompare(rightName);
}

function readVisibleEntries(relativeDir) {
  const absoluteDir = resolve(DOCS_ROOT, relativeDir);
  const config = getOrderConfig(relativeDir);
  const hiddenNames = new Set(config.hidden ?? []);
  const orderedNames = config.order ?? [];

  return readdirSync(absoluteDir, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith('.'))
    .filter((entry) => {
      if (isHiddenEntry(entry.name, hiddenNames)) return false;
      return entry.isDirectory() || DOC_EXTENSIONS.has(extname(entry.name).toLowerCase());
    })
    .sort((left, right) => compareByConfiguredOrder(left.name, right.name, orderedNames));
}

function buildSidebarItems(relativeDir = '') {
  const entries = readVisibleEntries(relativeDir);
  const items = [];

  for (const entry of entries) {
    const nextRelativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      const children = buildSidebarItems(nextRelativePath);
      if (children.length === 0) continue;
      const isLeafDirectory = children.every((child) => !('items' in child));
      const depth = nextRelativePath.split('/').length;
      if (isLeafDirectory && depth >= 3) {
        items.push(...children);
        continue;
      }

      const config = getOrderConfig(nextRelativePath);
      items.push({
        label: config.label ?? toLabel(entry.name),
        items: children,
      });
      continue;
    }

    const slug = toSlug(nextRelativePath);
    if (!slug) continue;
    items.push({ slug });
  }

  return items;
}

export function generateSidebar() {
  return buildSidebarItems();
}
