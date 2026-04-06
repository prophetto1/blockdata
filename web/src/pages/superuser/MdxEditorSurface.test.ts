import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('MdxEditorSurface', () => {
  it('escapes unknown text directives so workflow directive syntax does not break rich-text mode', () => {
    const source = readFileSync(resolve(__dirname, './MdxEditorSurface.tsx'), 'utf8');

    expect(source).toContain('directivesPlugin({');
    expect(source).toContain('directiveDescriptors: [AdmonitionDirectiveDescriptor],');
    expect(source).toContain('escapeUnknownTextDirectives: true,');
  });
});
