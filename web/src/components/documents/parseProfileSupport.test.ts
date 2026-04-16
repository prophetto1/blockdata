import { describe, expect, it } from 'vitest';

import { isParseSupported } from './parseProfileSupport';

describe('parseProfileSupport', () => {
  it('treats markdown files as non-parseable for conversion-backed parse actions', () => {
    expect(isParseSupported({ source_type: 'md' })).toBe(false);
    expect(isParseSupported({ source_type: 'markdown' })).toBe(false);
  });
});
