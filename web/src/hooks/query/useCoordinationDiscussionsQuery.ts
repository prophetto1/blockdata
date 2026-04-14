import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getCoordinationDiscussions, type CoordinationDiscussionResponse } from '@/lib/coordinationApi';
import { superuserKeys, type CoordinationDiscussionsQueryFilters } from '@/lib/queryKeys/superuserKeys';

type UseCoordinationDiscussionsQueryOptions = CoordinationDiscussionsQueryFilters & {
  enabled?: boolean;
};

export function useCoordinationDiscussionsQuery(
  options: UseCoordinationDiscussionsQueryOptions = {},
): UseQueryResult<CoordinationDiscussionResponse> {
  const {
    enabled,
    limit = 50,
    status = 'all',
    ...filters
  } = options;
  const queryFilters = { ...filters, limit, status };

  return useQuery({
    queryKey: superuserKeys.coordinationDiscussions(queryFilters),
    queryFn: () => getCoordinationDiscussions(queryFilters),
    staleTime: 15_000,
    enabled,
  });
}
