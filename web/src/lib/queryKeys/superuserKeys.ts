export type CoordinationIdentitiesQueryFilters = {
  host?: string;
  family?: string;
  includeStale?: boolean;
};

export type CoordinationDiscussionsQueryFilters = {
  taskId?: string;
  workspacePath?: string;
  status?: 'pending' | 'acknowledged' | 'stale' | 'all';
  limit?: number;
};

function normalizeCoordinationIdentitiesFilters(
  filters: CoordinationIdentitiesQueryFilters = {},
) {
  return {
    family: filters.family ?? null,
    host: filters.host ?? null,
    includeStale: filters.includeStale ?? true,
  };
}

function normalizeCoordinationDiscussionsFilters(
  filters: CoordinationDiscussionsQueryFilters = {},
) {
  return {
    limit: filters.limit ?? 50,
    status: filters.status ?? 'all',
    taskId: filters.taskId ?? null,
    workspacePath: filters.workspacePath ?? null,
  };
}

export const superuserKeys = {
  all: ['superuser'] as const,
  operationalReadinessSnapshot: () => [...superuserKeys.all, 'operational-readiness-snapshot'] as const,
  coordinationStatus: () => [...superuserKeys.all, 'coordination-status'] as const,
  coordinationIdentities: (filters: CoordinationIdentitiesQueryFilters = {}) =>
    [...superuserKeys.all, 'coordination-identities', normalizeCoordinationIdentitiesFilters(filters)] as const,
  coordinationDiscussions: (filters: CoordinationDiscussionsQueryFilters = {}) =>
    [...superuserKeys.all, 'coordination-discussions', normalizeCoordinationDiscussionsFilters(filters)] as const,
};
