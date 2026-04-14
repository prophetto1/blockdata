import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getCoordinationStatus, type CoordinationStatusResponse } from '@/lib/coordinationApi';
import { superuserKeys } from '@/lib/queryKeys/superuserKeys';

type UseCoordinationStatusQueryOptions = {
  enabled?: boolean;
};

export function useCoordinationStatusQuery(
  options: UseCoordinationStatusQueryOptions = {},
): UseQueryResult<CoordinationStatusResponse> {
  return useQuery({
    queryKey: superuserKeys.coordinationStatus(),
    queryFn: getCoordinationStatus,
    staleTime: 15_000,
    enabled: options.enabled,
  });
}
