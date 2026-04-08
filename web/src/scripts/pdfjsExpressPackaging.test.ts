import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const webPackageJsonPath = path.resolve(import.meta.dirname, '..', '..', 'package.json');

describe('PDF.js Express packaging scripts', () => {
  it('does not block dev or build on refreshing copied assets', () => {
    const webPackageJson = JSON.parse(readFileSync(webPackageJsonPath, 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(webPackageJson.scripts.dev).not.toContain('pdfjs-express:assets');
    expect(webPackageJson.scripts['dev:alt']).not.toContain('pdfjs-express:assets');
    expect(webPackageJson.scripts.build).not.toContain('pdfjs-express:assets');
    expect(webPackageJson.scripts['pdfjs-express:assets:refresh']).toBe(
      'node ./src/scripts/syncPdfjsExpressAssets.mjs',
    );
  });
});
