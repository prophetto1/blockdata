import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, it } from 'vitest';

// @ts-expect-error Test coverage intentionally imports the script entrypoint directly.
import { syncPdfjsExpressAssets } from './syncPdfjsExpressAssets.mjs';

type SyncPdfjsExpressAssetsResult = {
  mode: 'copied' | 'fallback';
  sourceDir: string | null;
  destinationDir: string;
};

function makeTempDir(name: string) {
  return mkdtempSync(path.join(os.tmpdir(), `pdfjs-express-${name}-`));
}

function seedAssetTree(baseDir: string) {
  mkdirSync(path.join(baseDir, 'ui'), { recursive: true });
  mkdirSync(path.join(baseDir, 'core'), { recursive: true });
  writeFileSync(path.join(baseDir, 'ui', 'index.html'), '<html></html>');
  writeFileSync(path.join(baseDir, 'core', 'webviewer-core.min.js'), 'console.log("ok");');
}

describe('syncPdfjsExpressAssets', () => {
  it('copies package assets into the public vendor directory when available', () => {
    const fixtureRoot = makeTempDir('copy');
    const packageDir = path.join(fixtureRoot, 'package');
    const destinationDir = path.join(fixtureRoot, 'public', 'vendor', 'pdfjs-express');

    try {
      seedAssetTree(path.join(packageDir, 'public'));

      const result = syncPdfjsExpressAssets({ packageDir, destinationDir });

      expect(result.mode).toBe('copied');
      expect(existsSync(path.join(destinationDir, 'ui', 'index.html'))).toBe(true);
      expect(existsSync(path.join(destinationDir, 'core', 'webviewer-core.min.js'))).toBe(true);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it('uses committed vendor assets when the installed package payload is unavailable', () => {
    const fixtureRoot = makeTempDir('fallback');
    const packageDir = path.join(fixtureRoot, 'package');
    const destinationDir = path.join(fixtureRoot, 'public', 'vendor', 'pdfjs-express');

    try {
      seedAssetTree(destinationDir);

      const result = syncPdfjsExpressAssets({ packageDir, destinationDir });

      expect(result.mode).toBe('fallback');
      expect(existsSync(path.join(destinationDir, 'ui', 'index.html'))).toBe(true);
      expect(existsSync(path.join(destinationDir, 'core', 'webviewer-core.min.js'))).toBe(true);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it('uses committed vendor assets when the npm package cannot be resolved', async () => {
    const fixtureRoot = makeTempDir('missing-package');
    const tempScriptPath = path.join(fixtureRoot, 'syncPdfjsExpressAssets.mjs');
    const destinationDir = path.join(fixtureRoot, 'public', 'vendor', 'pdfjs-express');
    const sourceScriptPath = path.resolve(import.meta.dirname, 'syncPdfjsExpressAssets.mjs');

    try {
      seedAssetTree(destinationDir);
      writeFileSync(tempScriptPath, readFileSync(sourceScriptPath, 'utf8'));

      const result = JSON.parse(
        execFileSync(
          process.execPath,
          [
            '--input-type=module',
            '--eval',
            `
              import { syncPdfjsExpressAssets } from ${JSON.stringify(pathToFileURL(tempScriptPath).href)};
              const result = syncPdfjsExpressAssets({ destinationDir: ${JSON.stringify(destinationDir)} });
              console.log(JSON.stringify(result));
            `,
          ],
          { encoding: 'utf8' }
        )
      ) as SyncPdfjsExpressAssetsResult;

      expect(result.mode).toBe('fallback');
      expect(existsSync(path.join(destinationDir, 'ui', 'index.html'))).toBe(true);
      expect(existsSync(path.join(destinationDir, 'core', 'webviewer-core.min.js'))).toBe(true);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});
