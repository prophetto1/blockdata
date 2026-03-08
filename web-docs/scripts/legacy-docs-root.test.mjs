import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, extname, basename, join, relative } from 'node:path';

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const legacyRoots = [
  { from: join(projectRoot, 'docs', 'docs'), to: join(projectRoot, 'src', 'content', 'docs') },
  { from: join(projectRoot, 'docs', 'tasks'), to: join(projectRoot, 'src', 'content', 'docs', 'tasks') },
];

function collectMarkdownFiles(root) {
  if (!existsSync(root)) return [];

  const results = [];

  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const next = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(next);
        continue;
      }

      if (/\.(md|mdx)$/i.test(entry.name)) {
        results.push(next);
      }
    }
  }

  walk(root);
  return results;
}

function normalizeRelativePath(relativePath) {
  return relativePath
    .replace(/\\/g, '/')
    .split('/')
    .map((segment, index, all) => {
      if (index !== all.length - 1) {
        return segment.replace(/[+.]/g, '-');
      }

      const extension = extname(segment);
      const stem = basename(segment, extension).replace(/[+.]/g, '-');
      return `${stem}${extension}`;
    })
    .join('/');
}

function shouldSkipMirroredFile(mapping, legacyFile) {
  const relativePath = relative(mapping.from, legacyFile).replace(/\\/g, '/');
  const segments = relativePath.split('/');
  const file = segments.at(-1);
  if (!file) return false;

  const extension = extname(file);
  const stem = basename(file, extension).toLowerCase();
  if (stem !== 'readme') return false;

  const siblingIndexPath = join(dirname(legacyFile), `index${extension}`);
  if (existsSync(siblingIndexPath)) return true;

  const mappedIndexPath = join(mapping.to, ...segments.slice(0, -1), `index${extension}`);
  return existsSync(mappedIndexPath);
}

run('legacy docs content is mirrored into the Astro docs root', () => {
  const missing = [];

  for (const mapping of legacyRoots) {
    for (const legacyFile of collectMarkdownFiles(mapping.from)) {
      if (shouldSkipMirroredFile(mapping, legacyFile)) continue;

      const mappedRelative = normalizeRelativePath(relative(mapping.from, legacyFile));
      const mirrored = join(mapping.to, mappedRelative);
      if (!existsSync(mirrored)) {
        missing.push(relative(projectRoot, legacyFile).replace(/\\/g, '/'));
      }
    }
  }

  assert.deepEqual(missing, []);
});
