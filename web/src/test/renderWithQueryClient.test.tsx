import { useQueryClient } from '@tanstack/react-query';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderWithQueryClient } from './renderWithQueryClient';

afterEach(cleanup);

function QueryClientProbe() {
  const queryClient = useQueryClient();

  return <span>{queryClient ? 'query-client-ready' : 'query-client-missing'}</span>;
}

describe('renderWithQueryClient', () => {
  it('mounts children under a QueryClientProvider', () => {
    const { unmount } = renderWithQueryClient(<QueryClientProbe />);

    expect(screen.getByText('query-client-ready')).toBeTruthy();

    unmount();
  });

  it('creates a fresh query client for each helper call', () => {
    const firstRender = renderWithQueryClient(<QueryClientProbe />);
    firstRender.queryClient.setQueryData(['superuser', 'smoke'], 'dirty');
    firstRender.unmount();

    const secondRender = renderWithQueryClient(<QueryClientProbe />);

    expect(secondRender.queryClient).not.toBe(firstRender.queryClient);
    expect(secondRender.queryClient.getQueryData(['superuser', 'smoke'])).toBeUndefined();

    secondRender.unmount();
  });
});
