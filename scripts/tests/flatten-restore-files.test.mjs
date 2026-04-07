import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { executeFlatten, planFlatten } from '../flatten-restore-files.mjs';

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'flatten-restore-files-'));
}

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

test('planFlatten keeps unique names and disambiguates basename collisions', () => {
  const root = makeTempDir();
  const source = path.join(root, 'restore');
  const output = path.join(root, 'flat');

  writeFile(path.join(source, 'alpha.md'), 'alpha');
  writeFile(path.join(source, 'nested-a', 'notes.md'), 'notes-a');
  writeFile(path.join(source, 'nested-b', 'notes.md'), 'notes-b');

  const plan = planFlatten({ source, output });
  const flatNames = plan.entries.map((entry) => entry.flatName);

  assert.deepEqual(flatNames, [
    'alpha.md',
    'notes__nested-a.md',
    'notes__nested-b.md',
  ]);
});

test('planFlatten rejects an output directory nested inside the source directory', () => {
  const root = makeTempDir();
  const source = path.join(root, 'restore');

  writeFile(path.join(source, 'one.txt'), 'one');

  assert.throws(
    () => planFlatten({ source, output: path.join(source, 'flat') }),
    /nested inside the source/,
  );
});

test('executeFlatten copies files and writes manifests', () => {
  const root = makeTempDir();
  const source = path.join(root, 'restore');
  const output = path.join(root, 'flat');

  writeFile(path.join(source, 'one.txt'), 'one');
  writeFile(path.join(source, 'nested', 'two.txt'), 'two');

  const plan = planFlatten({ source, output });
  const result = executeFlatten(plan, { mode: 'copy', dryRun: false });

  assert.equal(result.copiedCount, 2);
  assert.equal(fs.readFileSync(path.join(output, 'one.txt'), 'utf8'), 'one');
  assert.equal(fs.readFileSync(path.join(output, 'two.txt'), 'utf8'), 'two');
  assert.ok(fs.existsSync(path.join(output, 'flatten-manifest.json')));
  assert.ok(fs.existsSync(path.join(output, 'flatten-manifest.csv')));
  assert.ok(fs.existsSync(path.join(source, 'one.txt')));
});

test('executeFlatten can move files into the flat folder', () => {
  const root = makeTempDir();
  const source = path.join(root, 'restore');
  const output = path.join(root, 'flat');

  writeFile(path.join(source, 'nested', 'move-me.txt'), 'payload');

  const plan = planFlatten({ source, output });
  const result = executeFlatten(plan, { mode: 'move', dryRun: false });

  assert.equal(result.movedCount, 1);
  assert.equal(fs.existsSync(path.join(source, 'nested', 'move-me.txt')), false);
  assert.equal(fs.readFileSync(path.join(output, 'move-me.txt'), 'utf8'), 'payload');
});
