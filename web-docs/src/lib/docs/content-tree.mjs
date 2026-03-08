import { existsSync, readdirSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';

const DOCS_ROOT = 'src/content/docs';
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

function toDocsHref(relativePath) {
  let slug = stripExtension(normalizePath(relativePath));

  if (slug === 'index') return '/';
  if (slug.endsWith('/index')) slug = slug.slice(0, -'/index'.length);

  return `/${slug}/`;
}

function buildTreeNodes(absoluteDir, relativeDir = '') {
  let entries;
  try {
    entries = readdirSync(absoluteDir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
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
        extension: extname(entry.name).toLowerCase(),
      };
    });
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

export function getDocsHrefFromRelativePath(relativePath) {
  if (!relativePath) return '';
  return toDocsHref(relativePath);
}

export function getDocsContentTreeState() {
  const absoluteRoot = resolve(repoRoot, docsRootDir);

  if (!existsSync(absoluteRoot)) {
    return {
      treeRoot: {
        id: 'dir:root',
        name: 'docs',
        relativePath: '',
        children: [],
      },
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
  };
}

export { DOCS_ROOT };
