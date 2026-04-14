import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { PropsWithChildren, ReactElement } from 'react';
import { createAppQueryClient } from '@/lib/queryClient';

type RenderWithQueryClientOptions = Omit<RenderOptions, 'wrapper'> & {
  queryClient?: QueryClient;
};

export function createQueryClientWrapper(queryClient = createAppQueryClient({ testMode: true })) {
  function QueryClientWrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return {
    queryClient,
    wrapper: QueryClientWrapper,
  };
}

export function renderWithQueryClient(
  ui: ReactElement,
  options: RenderWithQueryClientOptions = {},
) {
  const { queryClient: providedQueryClient, ...renderOptions } = options;
  const { queryClient, wrapper } = createQueryClientWrapper(providedQueryClient);

  return {
    queryClient,
    ...render(ui, {
      wrapper,
      ...renderOptions,
    }),
  };
}
