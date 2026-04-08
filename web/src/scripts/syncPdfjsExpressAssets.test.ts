import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { syncPdfjsExpressAssets } from './syncPdfjsExpressAssets.mjs';

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

  it('uses existing fallback assets when the package cannot be resolved', () => {
    const destinationDirectory = createTempDirectory('pdfjs-express-destination-');
    writeRequiredMarkers(destinationDirectory);

    expect(() => syncPdfjsExpressAssets({ destinationDir: destinationDirectory })).not.toThrow();

    const result = syncPdfjsExpressAssets({ destinationDir: destinationDirectory });
    expect(['copied', 'fallback']).toContain(result.mode);
    expect(result.destinationDir).toBe(destinationDirectory);
  });
});
