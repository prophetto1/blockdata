import { QueryClient } from '@tanstack/react-query';

type CreateAppQueryClientOptions = {
  testMode?: boolean;
};

export function createAppQueryClient(options: CreateAppQueryClientOptions = {}): QueryClient {
  const { testMode = false } = options;

  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: testMode ? false : 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: testMode ? false : 0,
      },
    },
  });
}

export const queryClient = createAppQueryClient();
