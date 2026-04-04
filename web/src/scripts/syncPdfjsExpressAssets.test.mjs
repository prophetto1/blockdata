import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { syncPdfjsExpressAssets } from './syncPdfjsExpressAssets.mjs';

function makeTempDir(name) {
  return mkdtempSync(path.join(os.tmpdir(), `pdfjs-express-${name}-`));
}

function seedAssetTree(baseDir) {
  mkdirSync(path.join(baseDir, 'ui'), { recursive: true });
  mkdirSync(path.join(baseDir, 'core'), { recursive: true });
  writeFileSync(path.join(baseDir, 'ui', 'index.html'), '<html></html>');
  writeFileSync(path.join(baseDir, 'core', 'webviewer-core.min.js'), 'console.log("ok");');
}

test('copies package assets into the public vendor directory when available', () => {
  const fixtureRoot = makeTempDir('copy');
  const packageDir = path.join(fixtureRoot, 'package');
  const destinationDir = path.join(fixtureRoot, 'public', 'vendor', 'pdfjs-express');

  try {
    seedAssetTree(path.join(packageDir, 'public'));

    const result = syncPdfjsExpressAssets({ packageDir, destinationDir });

    assert.equal(result.mode, 'copied');
    assert.equal(existsSync(path.join(destinationDir, 'ui', 'index.html')), true);
    assert.equal(existsSync(path.join(destinationDir, 'core', 'webviewer-core.min.js')), true);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('uses committed vendor assets when the installed package payload is unavailable', () => {
  const fixtureRoot = makeTempDir('fallback');
  const packageDir = path.join(fixtureRoot, 'package');
  const destinationDir = path.join(fixtureRoot, 'public', 'vendor', 'pdfjs-express');

  try {
    seedAssetTree(destinationDir);

    const result = syncPdfjsExpressAssets({ packageDir, destinationDir });

    assert.equal(result.mode, 'fallback');
    assert.equal(existsSync(path.join(destinationDir, 'ui', 'index.html')), true);
    assert.equal(existsSync(path.join(destinationDir, 'core', 'webviewer-core.min.js')), true);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
