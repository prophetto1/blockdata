import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const themeCssPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'theme.css');
const themeCss = readFileSync(themeCssPath, 'utf8');

describe('parse layout responsive rules', () => {
  it('does not collapse schema test layout columns at <=1200px', () => {
    expect(themeCss).toContain('@media (max-width: 1200px)');
    expect(themeCss).toMatch(/\.parse-playground-layout:not\(\.schema-layout-test-page\)\s*\{/);
    expect(themeCss).toMatch(/\.parse-playground-layout:not\(\.schema-layout-test-page\)\s+\.parse-playground-explorer\s*\{/);
  });

});
