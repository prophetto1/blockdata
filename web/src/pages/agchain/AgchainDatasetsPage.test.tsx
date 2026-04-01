import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import * as agchainDatasetContracts from '@/lib/agchainDatasets';
import * as agchainRunContracts from '@/lib/agchainRuns';
import type {
  AgchainDatasetCreateResponse,
  AgchainDatasetDetail,
  AgchainDatasetDetailResponse,
  AgchainDatasetListResponse,
  AgchainDatasetListRow,
  AgchainDatasetSourceConfig,
  AgchainDatasetVersionSummary,
} from '@/lib/agchainDatasets';
import type { AgchainOperationStatus } from '@/lib/agchainRuns';
import AgchainDatasetsPage from './AgchainDatasetsPage';

const useAgchainProjectFocusMock = vi.fn();

vi.mock('@/hooks/agchain/useAgchainProjectFocus', () => ({
  useAgchainProjectFocus: () => useAgchainProjectFocusMock(),
}));

const DATASET_ROW: AgchainDatasetListRow = {
  dataset_id: 'dataset-1',
  slug: 'legal-10-train',
  name: 'Legal-10 Train',
  description: 'Training split for the focused AGChain project.',
  status: 'active',
  source_type: 'jsonl',
  latest_version_id: 'dataset-version-1',
  latest_version_label: 'v1',
  sample_count: 128,
  validation_status: 'warn',
  updated_at: '2026-03-31T16:45:00Z',
};

const SOURCE_CONFIG: AgchainDatasetSourceConfig = {
  source_type: 'huggingface',
  source_uri: 'hf://datasets/org/legal-10',
  path: 'org/legal-10',
  split: 'train',
  trust: false,
  cached: true,
  extra_kwargs: {},
};

const OPERATION_STATUS: AgchainOperationStatus = {
  operation_id: 'operation-1',
  operation_type: 'dataset_preview',
  status: 'queued',
  poll_url: '/agchain/operations/operation-1',
  cancel_url: '/agchain/operations/operation-1/cancel',
  target_kind: 'dataset_version_draft',
  target_id: 'draft-1',
  attempt_count: 0,
  progress: {},
  last_error: null,
  result: null,
  created_at: '2026-03-31T16:45:00Z',
  started_at: null,
  heartbeat_at: null,
  completed_at: null,
};

const DATASET_VERSION: AgchainDatasetVersionSummary = {
  dataset_version_id: 'dataset-version-1',
  version_label: 'v1',
  created_at: '2026-03-31T16:45:00Z',
  sample_count: 128,
  checksum: 'sha256:dataset-version-1',
  validation_status: 'warn',
  base_version_id: null,
};

const DATASET_DETAIL: AgchainDatasetDetail = {
  dataset_id: 'dataset-1',
  slug: 'legal-10-train',
  name: 'Legal-10 Train',
  description: 'Training split for the focused AGChain project.',
  tags: ['legal', 'train'],
  status: 'active',
  source_type: 'jsonl',
  latest_version_id: 'dataset-version-1',
  latest_version_label: 'v1',
  sample_count: 128,
  validation_status: 'warn',
  updated_at: '2026-03-31T16:45:00Z',
};

const DATASET_LIST_RESPONSE: AgchainDatasetListResponse = {
  items: [DATASET_ROW],
  next_cursor: null,
};

const DATASET_DETAIL_RESPONSE: AgchainDatasetDetailResponse = {
  dataset: DATASET_DETAIL,
  selected_version: DATASET_VERSION,
  tab_counts: {
    samples: 128,
    versions: 1,
    validation: 3,
  },
  warnings_summary: {
    warning_count: 3,
    duplicate_id_count: 0,
    missing_field_count: 1,
    unsupported_payload_count: 0,
  },
  available_actions: ['create_version_draft', 're_run_preview'],
};

const DATASET_CREATE_RESPONSE: AgchainDatasetCreateResponse = OPERATION_STATUS;

afterEach(() => {
  cleanup();
});

describe('AgchainDatasetsPage', () => {
  beforeEach(() => {
    useAgchainProjectFocusMock.mockReset();
    useAgchainProjectFocusMock.mockReturnValue({
      focusedProject: {
        benchmark_id: 'benchmark-1',
        benchmark_slug: 'legal-10',
        benchmark_name: 'Legal-10',
        description: 'Three-step benchmark package for legal analysis.',
      },
      loading: false,
    });
  });

  it('renders the focused-project dataset placeholder while compiling against shared AGChain lib contracts', () => {
    expect(agchainDatasetContracts).toBeTypeOf('object');
    expect(agchainRunContracts).toBeTypeOf('object');
    expect(DATASET_ROW.slug).toBe('legal-10-train');
    expect(DATASET_LIST_RESPONSE.items).toHaveLength(1);
    expect(DATASET_DETAIL_RESPONSE.selected_version?.dataset_version_id).toBe('dataset-version-1');
    expect('operation_id' in DATASET_CREATE_RESPONSE).toBe(true);
    expect(SOURCE_CONFIG.source_type).toBe('huggingface');
    expect(OPERATION_STATUS.operation_type).toBe('dataset_preview');

    render(
      <MemoryRouter>
        <AgchainDatasetsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Datasets' })).toBeInTheDocument();
    expect(screen.getByText(/legal-10 owns this datasets page/i)).toBeInTheDocument();
    expect(screen.getByText('Project-scoped placeholder surface')).toBeInTheDocument();
  });
});
