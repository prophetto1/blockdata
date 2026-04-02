import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AgchainDatasetDetailPage from './AgchainDatasetDetailPage';

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
  if (typeof globalThis.IntersectionObserver === 'undefined') {
    globalThis.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof IntersectionObserver;
  }
});

const platformApiFetchMock = vi.fn();

vi.mock('@/lib/platformApi', () => ({
  platformApiFetch: (...args: unknown[]) => platformApiFetchMock(...args),
}));

const useAgchainProjectFocusMock = vi.fn();

vi.mock('@/hooks/agchain/useAgchainProjectFocus', () => ({
  useAgchainProjectFocus: () => useAgchainProjectFocusMock(),
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const DETAIL_RESPONSE = {
  dataset: {
    dataset_id: 'dataset-1',
    slug: 'legal-qa',
    name: 'Legal QA Dataset',
    description: 'Legal evaluation samples.',
    tags: ['legal', 'train'],
    status: 'active',
    source_type: 'csv',
    latest_version_id: 'version-1',
    latest_version_label: 'v3',
    sample_count: 15302,
    validation_status: 'pass',
    updated_at: '2026-03-31T16:45:00Z',
  },
  selected_version: {
    dataset_version_id: 'version-1',
    version_label: 'v3',
    created_at: '2026-03-31T16:45:00Z',
    sample_count: 15302,
    checksum: 'sha256:abc123def',
    validation_status: 'pass',
    base_version_id: null,
  },
  tab_counts: { samples: 15302, versions: 3, validation: 0 },
  warnings_summary: {
    warning_count: 0,
    duplicate_id_count: 0,
    missing_field_count: 0,
    unsupported_payload_count: 0,
  },
  available_actions: ['create_version_draft'],
};

const VERSIONS_RESPONSE = {
  items: [
    {
      dataset_version_id: 'version-1',
      version_label: 'v3',
      created_at: '2026-03-31T16:45:00Z',
      sample_count: 15302,
      checksum: 'sha256:abc123def',
      validation_status: 'pass',
      base_version_id: 'version-0',
    },
  ],
  next_cursor: null,
};

const SAMPLES_RESPONSE = {
  items: [
    {
      sample_id: 'sample-001',
      input_preview: 'What is contract law?',
      target_preview: 'Contract law governs...',
      choices: [],
      metadata: {},
      has_setup: false,
      has_sandbox: true,
      has_files: false,
      parse_status: 'ok',
    },
  ],
  next_cursor: null,
};

describe('AgchainDatasetDetailPage', () => {
  beforeEach(() => {
    platformApiFetchMock.mockReset();
    useAgchainProjectFocusMock.mockReset();
    useAgchainProjectFocusMock.mockReturnValue({
      focusedProject: {
        project_id: 'project-1',
        project_slug: 'legal-10',
        project_name: 'Legal-10',
        benchmark_slug: 'legal-10',
        benchmark_name: 'Legal-10',
      },
      loading: false,
    });

    platformApiFetchMock.mockImplementation((path: string) => {
      if (path.includes('/detail')) {
        return Promise.resolve(jsonResponse(DETAIL_RESPONSE));
      }
      if (path.includes('/versions') && !path.includes('/samples') && !path.includes('/source') && !path.includes('/mapping') && !path.includes('/validation')) {
        return Promise.resolve(jsonResponse(VERSIONS_RESPONSE));
      }
      if (path.includes('/samples')) {
        return Promise.resolve(jsonResponse(SAMPLES_RESPONSE));
      }
      if (path.includes('/source')) {
        return Promise.resolve(
          jsonResponse({
            dataset_version_id: 'version-1',
            source_type: 'csv',
            source_uri: 'gs://bucket/data.csv',
            source_config_jsonb: { source_type: 'csv', source_uri: 'gs://bucket/data.csv' },
          }),
        );
      }
      if (path.includes('/mapping')) {
        return Promise.resolve(
          jsonResponse({
            dataset_version_id: 'version-1',
            field_spec_jsonb: { input: { path: '$.prompt' }, target: { path: '$.answer' } },
            field_resolution_summary: {},
          }),
        );
      }
      if (path.includes('/validation')) {
        return Promise.resolve(
          jsonResponse({
            dataset_version_id: 'version-1',
            validation_status: 'pass',
            issue_groups: [],
            warning_counts: {
              warning_count: 0,
              duplicate_id_count: 0,
              missing_field_count: 0,
              unsupported_payload_count: 0,
            },
            generated_at: '2026-03-31T16:45:00Z',
          }),
        );
      }
      return Promise.reject(new Error(`Unhandled: ${path}`));
    });
  });

  afterEach(() => {
    cleanup();
  });

  function renderWithRoute() {
    return render(
      <MemoryRouter initialEntries={['/app/agchain/datasets/dataset-1']}>
        <Routes>
          <Route path="/app/agchain/datasets/:datasetId" element={<AgchainDatasetDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('loads dataset detail and shows header', async () => {
    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('Legal QA Dataset')).toBeInTheDocument();
    });

    expect(screen.getByText('legal-qa')).toBeInTheDocument();
    expect(screen.getByText('Legal evaluation samples.')).toBeInTheDocument();
    expect(screen.getByText('legal')).toBeInTheDocument();
    expect(screen.getByText('train')).toBeInTheDocument();
  });

  it('shows tabs and defaults to Samples', async () => {
    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('Legal QA Dataset')).toBeInTheDocument();
    });

    expect(screen.getByText('Samples')).toBeInTheDocument();
    expect(screen.getByText('Versions')).toBeInTheDocument();
    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(screen.getByText('Mapping')).toBeInTheDocument();
    expect(screen.getByText('Validation')).toBeInTheDocument();
  });

  it('switches to Versions tab and shows version history', async () => {
    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('Legal QA Dataset')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Versions'));

    await waitFor(() => {
      expect(screen.getByText('v3')).toBeInTheDocument();
    });
  });

  it('renders the + New Version button', async () => {
    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('Legal QA Dataset')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: '+ New Version' })).toBeInTheDocument();
  });
});
