import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getCoordinationIdentities, type CoordinationIdentityResponse } from '@/lib/coordinationApi';
import { superuserKeys, type CoordinationIdentitiesQueryFilters } from '@/lib/queryKeys/superuserKeys';

type UseCoordinationIdentitiesQueryOptions = CoordinationIdentitiesQueryFilters & {
  enabled?: boolean;
};

export function useCoordinationIdentitiesQuery(
  options: UseCoordinationIdentitiesQueryOptions = {},
): UseQueryResult<CoordinationIdentityResponse> {
  const { enabled, includeStale = true, ...filters } = options;
  const queryFilters = { ...filters, includeStale };

  return useQuery({
    queryKey: superuserKeys.coordinationIdentities(queryFilters),
    queryFn: () => getCoordinationIdentities(queryFilters),
    staleTime: 15_000,
    enabled,
  });
}
