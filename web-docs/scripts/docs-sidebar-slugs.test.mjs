/**
 * Validates that sidebar-order.mjs stays in sync with the filesystem.
 *
 * Catches:
 *  - Order entries referencing files/dirs that don't exist
 *  - Hidden entries referencing files/dirs that don't exist
 *  - Directories on disk that have no sidebar-order config
 */

import { readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import sidebarOrder from '../src/lib/docs/sidebar-order.mjs';

const docsRoot = resolve(process.cwd(), 'src/content/docs');

function stripExtension(name) {
  return name.replace(/\.[^.]+$/, '');
}

function getEntryNames(absoluteDir) {
  if (!existsSync(absoluteDir)) return [];
  return readdirSync(absoluteDir, { withFileTypes: true })
    .filter((e) => !e.name.startsWith('.'))
    .map((e) => (e.isDirectory() ? e.name : stripExtension(e.name)));
}

function run(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

// Validate each config entry
for (const [dirPath, config] of Object.entries(sidebarOrder)) {
  const absoluteDir = dirPath === '.'
    ? docsRoot
    : resolve(docsRoot, dirPath);

  run(`"${dirPath}" directory exists`, () => {
    assert.ok(existsSync(absoluteDir), `Directory does not exist: ${dirPath}`);
  });

  if (config.order) {
    run(`"${dirPath}" order entries exist on disk`, () => {
      const diskNames = getEntryNames(absoluteDir);
      for (const name of config.order) {
        assert.ok(
          diskNames.includes(name),
          `Order entry "${name}" not found in ${dirPath}/ (found: ${diskNames.join(', ')})`
        );
      }
    });
  }

  if (config.hidden) {
    run(`"${dirPath}" hidden entries exist on disk`, () => {
      const diskNames = getEntryNames(absoluteDir);
      for (const name of config.hidden) {
        assert.ok(
          diskNames.includes(name),
          `Hidden entry "${name}" not found in ${dirPath}/ (found: ${diskNames.join(', ')})`
        );
      }
    });
  }
}

// Check all content directories have config
run('all directories with content have sidebar-order config', () => {
  const missing = [];

  function walk(absoluteDir, relativePath) {
    const entries = readdirSync(absoluteDir, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.'));

    for (const dir of dirs) {
      const childRelative = relativePath ? `${relativePath}/${dir.name}` : dir.name;
      const childAbsolute = resolve(absoluteDir, dir.name);

      // Skip dirs listed as hidden in parent config
      const parentConfig = sidebarOrder[relativePath || '.'] || {};
      if (parentConfig.hidden?.includes(dir.name)) continue;

      const childEntries = readdirSync(childAbsolute, { withFileTypes: true });
      const hasContent = childEntries.some(
        (f) => f.name.endsWith('.md') || f.name.endsWith('.mdx')
      );
      const hasSubdirs = childEntries.some(
        (e) => e.isDirectory() && !e.name.startsWith('.')
      );

      if ((hasContent || hasSubdirs) && !sidebarOrder[childRelative]) {
        missing.push(childRelative);
      }

      walk(childAbsolute, childRelative);
    }
  }

  walk(docsRoot, '');

  if (missing.length > 0) {
    assert.fail(
      `Directories without sidebar-order config: ${missing.join(', ')}\n` +
      'Add entries to src/lib/docs/sidebar-order.mjs to control their ordering.'
    );
  }
});

// Verify generated sidebar produces valid output
run('generateSidebar produces non-empty output', async () => {
  const { generateSidebar } = await import('../src/lib/docs/generate-sidebar.mjs');
  const sidebar = generateSidebar();
  assert.ok(Array.isArray(sidebar), 'generateSidebar() should return an array');
  assert.ok(sidebar.length > 0, 'generateSidebar() should return at least one item');
});
