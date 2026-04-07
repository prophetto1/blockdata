import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { findDuplicateDirectories } from '../find-duplicate-directories.mjs';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'find-duplicate-directories-'));
}

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

test('finds an exact duplicate top-level restore directory elsewhere in the repo', () => {
  const root = makeTempDir();

  writeFile(path.join(root, '__start-here', 'restore', 'alpha', 'a.txt'), 'one');
  writeFile(path.join(root, '__start-here', 'restore', 'alpha', 'nested', 'b.txt'), 'two');
  writeFile(path.join(root, 'canonical', 'alpha', 'a.txt'), 'one');
  writeFile(path.join(root, 'canonical', 'alpha', 'nested', 'b.txt'), 'two');

  const report = findDuplicateDirectories({ cwd: root, source: '__start-here/restore' });
  const alpha = report.results.find((row) => row.sourceRelativePath.endsWith(path.join('restore', 'alpha')));

  assert.ok(alpha);
  assert.deepEqual(alpha.duplicates.map((duplicate) => duplicate.relativePath), [
    path.join('canonical', 'alpha'),
  ]);
});

test('does not report source-internal copies as duplicates', () => {
  const root = makeTempDir();

  writeFile(path.join(root, '__start-here', 'restore', 'alpha', 'a.txt'), 'one');
  writeFile(path.join(root, '__start-here', 'restore', 'beta', 'a.txt'), 'one');

  const report = findDuplicateDirectories({ cwd: root, source: '__start-here/restore' });
  const alpha = report.results.find((row) => row.sourceRelativePath.endsWith(path.join('restore', 'alpha')));
  const beta = report.results.find((row) => row.sourceRelativePath.endsWith(path.join('restore', 'beta')));

  assert.ok(alpha);
  assert.ok(beta);
  assert.equal(alpha.duplicates.length, 0);
  assert.equal(beta.duplicates.length, 0);
});

test('ignores desktop.ini by default and skips empty-after-ignore directories', () => {
  const root = makeTempDir();

  writeFile(path.join(root, '__start-here', 'restore', 'alpha', 'desktop.ini'), 'stub');
  writeFile(path.join(root, 'canonical', 'alpha', 'desktop.ini'), 'stub');

  const report = findDuplicateDirectories({ cwd: root, source: '__start-here/restore' });

  assert.equal(report.sourceDirectoryCount, 0);
  assert.equal(report.results.length, 0);
});

test('can inspect nested source directories when recursive mode is enabled', () => {
  const root = makeTempDir();

  writeFile(path.join(root, '__start-here', 'restore', 'alpha', 'nested', 'a.txt'), 'one');
  writeFile(path.join(root, 'canonical', 'nested-copy', 'a.txt'), 'one');

  const report = findDuplicateDirectories({
    cwd: root,
    source: '__start-here/restore',
    recursiveSource: true,
  });

  const nested = report.results.find((row) => row.sourceRelativePath.endsWith(path.join('restore', 'alpha', 'nested')));
  assert.ok(nested);
  assert.deepEqual(nested.duplicates.map((duplicate) => duplicate.relativePath), [
    path.join('canonical', 'nested-copy'),
  ]);
});
