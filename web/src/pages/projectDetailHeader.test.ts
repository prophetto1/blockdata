import { describe, expect, it } from 'vitest';
import { resolveProjectDetailHeaderTitle } from './projectDetailHeader';

describe('resolveProjectDetailHeaderTitle', () => {
  it('returns Parse for parse mode', () => {
    expect(resolveProjectDetailHeaderTitle('parse')).toBe('Parse');
  });

  it('returns Extract for extract mode', () => {
    expect(resolveProjectDetailHeaderTitle('extract')).toBe('Extract');
  });

  it('returns Transform for transform mode', () => {
    expect(resolveProjectDetailHeaderTitle('transform')).toBe('Transform');
  });
});
