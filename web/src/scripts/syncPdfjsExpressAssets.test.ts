import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

type SyncPdfjsExpressAssetsResult = {
  mode: 'copied' | 'fallback';
  sourceDir: string | null;
  destinationDir: string;
};

type SyncPdfjsExpressAssets = (options?: {
  packageDir?: string;
  destinationDir?: string;
}) => SyncPdfjsExpressAssetsResult;

const require = createRequire(import.meta.url);
const { syncPdfjsExpressAssets } = require('./syncPdfjsExpressAssets.mjs') as {
  syncPdfjsExpressAssets: SyncPdfjsExpressAssets;
};

const tempDirectories: string[] = [];

function createTempDirectory(prefix: string) {
  const directory = mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirectories.push(directory);
  return directory;
}

function writeRequiredMarkers(rootDirectory: string) {
  const uiDirectory = path.join(rootDirectory, 'ui');
  const coreDirectory = path.join(rootDirectory, 'core');

  mkdirSync(uiDirectory, { recursive: true });
  mkdirSync(coreDirectory, { recursive: true });
  writeFileSync(path.join(uiDirectory, 'index.html'), '<html></html>');
  writeFileSync(path.join(coreDirectory, 'webviewer-core.min.js'), 'console.log("ok");');
}

describe('syncPdfjsExpressAssets', () => {
  afterEach(() => {
    for (const directory of tempDirectories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('uses existing fallback assets when the installed package payload is unavailable', () => {
    const packageDirectory = createTempDirectory('pdfjs-express-package-');
    const destinationDirectory = createTempDirectory('pdfjs-express-destination-');
    writeRequiredMarkers(destinationDirectory);

    const result = syncPdfjsExpressAssets({
      packageDir: packageDirectory,
      destinationDir: destinationDirectory,
    });
    expect(result.mode).toBe('fallback');
    expect(result.destinationDir).toBe(destinationDirectory);
  });
});
