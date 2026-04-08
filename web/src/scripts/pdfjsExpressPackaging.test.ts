import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const packageJsonPath = path.resolve(import.meta.dirname, '..', '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
  scripts?: Record<string, string>;
};

describe('PDF.js Express packaging scripts', () => {
  it('keeps asset sync as an explicit maintenance command', () => {
    expect(packageJson.scripts?.['pdfjs-express:assets:refresh']).toBe(
      'node ./src/scripts/syncPdfjsExpressAssets.mjs'
    );
  });

  it('does not block dev or build commands on asset refresh', () => {
    expect(packageJson.scripts?.dev).not.toContain('pdfjs-express:assets');
    expect(packageJson.scripts?.['dev:alt']).not.toContain('pdfjs-express:assets');
    expect(packageJson.scripts?.build).not.toContain('pdfjs-express:assets');
  });
});
