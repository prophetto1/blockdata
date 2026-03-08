import { existsSync, readdirSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import { collectionRoutes, singletonRoutes, DOCS_ROOT } from '../keystatic/routes.mjs';

const repoRoot = process.cwd();
const docsRootDir = DOCS_ROOT;

function compareEntries(left, right) {
  if (left.isDirectory() && !right.isDirectory()) return -1;
  if (!left.isDirectory() && right.isDirectory()) return 1;
  return left.name.localeCompare(right.name);
}

function normalizePath(value) {
  return value.replace(/\\/g, '/');
}

function stripExtension(relativePath) {
  return relativePath.replace(/\.[^.]+$/, '');
}

function toCollectionHref(collection, slug) {
  return `/keystatic/collection/${collection}/item/${encodeURIComponent(slug)}`;
}

function toSingletonHref(singleton) {
  return `/keystatic/singleton/${singleton}`;
}

function toEditorHref(relativePath) {
  const normalizedPath = normalizePath(relativePath);
  const slug = stripExtension(normalizedPath).split('/').at(-1);

  // Check singletons (exact match)
  const singletonName = singletonRoutes.get(normalizedPath);
  if (singletonName) return toSingletonHref(singletonName);

  // Check collections (longest prefix wins — already sorted)
  for (const [prefix, collectionName] of collectionRoutes) {
    if (normalizedPath.startsWith(prefix)) {
      return toCollectionHref(collectionName, slug);
    }
  }

  return '/keystatic';
}

function toDocsHref(relativePath) {
  let slug = stripExtension(normalizePath(relativePath));

  if (slug === 'index') return '/';
  if (slug.endsWith('/index')) slug = slug.slice(0, -'/index'.length);

  return `/${slug}/`;
}

function buildTreeNodes(absoluteDir, relativeDir = '') {
  return readdirSync(absoluteDir, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith('.'))
    .sort(compareEntries)
    .map((entry) => {
      const nextRelativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
      const absolutePath = resolve(absoluteDir, entry.name);

      if (entry.isDirectory()) {
        return {
          id: `dir:${nextRelativePath}`,
          name: entry.name,
          relativePath: nextRelativePath,
          children: buildTreeNodes(absolutePath, nextRelativePath),
        };
      }

      return {
        id: `file:${nextRelativePath}`,
        name: entry.name,
        relativePath: nextRelativePath,
        docsHref: toDocsHref(nextRelativePath),
        editorHref: toEditorHref(nextRelativePath),
        extension: extname(entry.name).toLowerCase(),
      };
    });
}

function findFirstEditorHref(nodes) {
  for (const node of nodes) {
    if (node.editorHref) return node.editorHref;
    if (node.children?.length) {
      const nestedHref = findFirstEditorHref(node.children);
      if (nestedHref) return nestedHref;
    }
  }
  return '/keystatic';
}

export function getCurrentDocsRelativePath(filePath) {
  if (!filePath) return '';

  const docsRoot = resolve(repoRoot, docsRootDir);
  const normalizedPath = normalizePath(filePath);

  if (normalizedPath.startsWith(`${docsRootDir}/`)) {
    return normalizePath(normalizedPath.slice(docsRootDir.length + 1));
  }

  const relativePath = normalizePath(relative(docsRoot, resolve(repoRoot, filePath)));
  return relativePath.startsWith('..') ? '' : relativePath;
}

export function getDocsContentTreeState() {
  const absoluteRoot = resolve(repoRoot, docsRootDir);
  const siteHomeHref = toSingletonHref('siteHome');

  if (!existsSync(absoluteRoot)) {
    return {
      treeRoot: {
        id: 'dir:root',
        name: 'docs',
        relativePath: '',
        children: [],
      },
      defaultEditorHref: siteHomeHref,
    };
  }

  const children = buildTreeNodes(absoluteRoot);

  return {
    treeRoot: {
      id: 'dir:root',
      name: 'docs',
      relativePath: '',
      children,
    },
    defaultEditorHref: children.some((node) => node.id === 'file:index.mdx')
      ? siteHomeHref
      : findFirstEditorHref(children),
  };
}
