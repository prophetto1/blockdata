export type FlowLabel = {
  key: string;
  value: string;
};

export type FlowListItem = {
  routeId: string;
  flowId: string;
  namespace: string;
  labels: FlowLabel[];
  lastExecutionDate: string | null;
  lastExecutionStatus: string | null;
  executionStatistics: string | null;
  revision: number | null;
  updatedAt: string | null;
  description: string | null;
  disabled: boolean;
  triggerCount: number;
};

export type FlowSortField = 'id' | 'namespace';
export type FlowSortDir = 'asc' | 'desc';

export type FlowsSearchParams = {
  query?: string;
  namespace?: string;
  labels?: string[];
  page?: number;
  size?: number;
  sort?: FlowSortField;
  sortDir?: FlowSortDir;
};

export type FlowsSearchResult = {
  results: FlowListItem[];
  total: number;
};
