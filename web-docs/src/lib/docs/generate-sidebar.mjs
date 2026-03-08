/**
 * Generates a Starlight sidebar array from the filesystem + sidebar-order config.
 *
 * Usage in astro.config.mjs:
 *   import { generateSidebar } from './src/lib/docs/generate-sidebar.mjs';
 *   sidebar: generateSidebar(),
 */

import { readdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import sidebarOrder from './sidebar-order.mjs';

const docsRoot = resolve(process.cwd(), 'src/content/docs');

function normalizeSlugSegment(name) {
  return name.replace(/[+.]/g, '-');
}

function titleCase(name) {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function stripExtension(name) {
  return name.replace(/\.[^.]+$/, '');
}

function isIndexLike(name) {
  return stripExtension(name).toLowerCase() === 'index';
}

function isReadmeLike(name) {
  return stripExtension(name).toLowerCase() === 'readme';
}

function getConfig(dirPath) {
  return sidebarOrder[dirPath] || {};
}

function sortEntries(entries, dirPath) {
  const config = getConfig(dirPath);
  const order = config.order || [];
  const orderMap = new Map(order.map((name, i) => [name, i]));

  return [...entries].sort((a, b) => {
    const aName = stripExtension(a.name);
    const bName = stripExtension(b.name);
    const aIndex = orderMap.has(aName) ? orderMap.get(aName) : Infinity;
    const bIndex = orderMap.has(bName) ? orderMap.get(bName) : Infinity;

    if (aIndex !== bIndex) return aIndex - bIndex;
    return a.name.localeCompare(b.name);
  });
}

function isHidden(name, dirPath) {
  const config = getConfig(dirPath);
  const hidden = config.hidden || [];
  return hidden.includes(stripExtension(name)) || name.startsWith('.');
}

function toSlug(relativePath) {
  const slug = stripExtension(relativePath)
    .replace(/\\/g, '/')
    .split('/')
    .map((segment, index, all) => {
      const normalized = isReadmeLike(segment) && index === all.length - 1
        ? 'index'
        : segment;
      return normalizeSlugSegment(normalized);
    })
    .join('/');
  if (slug !== 'index' && slug.endsWith('/index')) {
    return slug.slice(0, -'/index'.length);
  }
  return slug;
}

function buildSidebarItems(absoluteDir, relativePath) {
  const entries = readdirSync(absoluteDir, { withFileTypes: true });
  const sorted = sortEntries(entries, relativePath || '.');

  const items = [];
  const hasIndexEntry = sorted.some((entry) => !entry.isDirectory() && isIndexLike(entry.name));

  for (const entry of sorted) {
    if (isHidden(entry.name, relativePath || '.')) continue;
    if (!entry.isDirectory() && isReadmeLike(entry.name) && hasIndexEntry) continue;

    const childRelative = relativePath
      ? `${relativePath}/${entry.name}`
      : entry.name;
    const childAbsolute = resolve(absoluteDir, entry.name);

    if (entry.isDirectory()) {
      const config = getConfig(childRelative);
      const label = config.label || titleCase(entry.name);
      const children = buildSidebarItems(childAbsolute, childRelative);

      if (children.length > 0) {
        items.push({ label, items: children });
      }
    } else {
      const ext = extname(entry.name).toLowerCase();
      if (ext !== '.md' && ext !== '.mdx') continue;

      items.push({ slug: toSlug(childRelative) });
    }
  }

  return items;
}

export function generateSidebar() {
  return buildSidebarItems(docsRoot, '');
}
