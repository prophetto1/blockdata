import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSessionStorageState } from './useSessionStorageState';

describe('useSessionStorageState', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('restores the stored value after a remount for the same key', () => {
    const initialState = {
      selectedProviderSlug: '',
      providerSearch: '',
      search: '',
    };

    const firstRender = renderHook(() => useSessionStorageState('agchain-admin-models:user-1', initialState));

    act(() => {
      firstRender.result.current[1]({
        selectedProviderSlug: 'vertex-ai',
        providerSearch: 'vertex',
        search: 'gemini',
      });
    });

    firstRender.unmount();

    const secondRender = renderHook(() => useSessionStorageState('agchain-admin-models:user-1', initialState));

    expect(secondRender.result.current[0]).toEqual({
      selectedProviderSlug: 'vertex-ai',
      providerSearch: 'vertex',
      search: 'gemini',
    });
  });

  it('rehydrates from the next storage key instead of carrying the old key state forward', () => {
    const initialState = {
      selectedProviderSlug: '',
      providerSearch: '',
      search: '',
    };

    window.sessionStorage.setItem(
      'agchain-admin-models:user-2',
      JSON.stringify({
        selectedProviderSlug: 'openai',
        providerSearch: 'open',
        search: 'gpt',
      }),
    );

    const { result, rerender } = renderHook(
      ({ storageKey }) => useSessionStorageState(storageKey, initialState),
      {
        initialProps: { storageKey: 'agchain-admin-models:user-1' },
      },
    );

    act(() => {
      result.current[1]({
        selectedProviderSlug: 'vertex-ai',
        providerSearch: 'vertex',
        search: 'gemini',
      });
    });

    rerender({ storageKey: 'agchain-admin-models:user-2' });

    expect(result.current[0]).toEqual({
      selectedProviderSlug: 'openai',
      providerSearch: 'open',
      search: 'gpt',
    });
  });
});
