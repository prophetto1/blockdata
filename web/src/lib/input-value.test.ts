import { describe, expect, it } from 'vitest';
import { coerceTextInputValue } from '@/lib/input-value';

describe('coerceTextInputValue', () => {
  it('reads value from DOM change events', () => {
    const eventLike = { currentTarget: { value: 'worker reason' } };
    expect(coerceTextInputValue(eventLike)).toBe('worker reason');
  });

  it('reads value from detail objects that expose value directly', () => {
    const detailLike = { value: 'worker reason detail' };
    expect(coerceTextInputValue(detailLike)).toBe('worker reason detail');
  });

  it('returns empty string when value cannot be found', () => {
    expect(coerceTextInputValue(undefined)).toBe('');
    expect(coerceTextInputValue({})).toBe('');
  });
});
