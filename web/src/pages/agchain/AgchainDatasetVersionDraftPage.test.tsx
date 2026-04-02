import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AgchainDatasetVersionDraftPage from './AgchainDatasetVersionDraftPage';

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

const DRAFT_RESPONSE = {
  draft_id: 'draft-1',
  base_version_id: 'version-1',
  source_config_jsonb: { source_type: 'csv', source_uri: 'gs://bucket/data.csv' },
  field_spec_jsonb: {
    input: { path: '$.prompt' },
    messages: null,
    choices: null,
    target: { path: '$.answer' },
    id: null,
    metadata: null,
    sandbox: null,
    files: null,
    setup: null,
  },
  materialization_options_jsonb: {
    shuffle: false,
    shuffle_choices: false,
    limit: null,
    auto_id: false,
    deterministic_seed: null,
  },
  preview_summary: {},
  validation_summary: {
    validation_status: 'pass',
    warning_count: 0,
    duplicate_id_count: 0,
    missing_field_count: 0,
    unsupported_payload_count: 0,
    issue_groups: [],
    generated_at: null,
    source_hash: null,
  },
  dirty_state: {},
};

describe('AgchainDatasetVersionDraftPage', () => {
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
      if (path.includes('/version-drafts/draft-1') && !path.includes('/preview') && !path.includes('/commit')) {
        return Promise.resolve(jsonResponse(DRAFT_RESPONSE));
      }
      if (path.includes('/preview')) {
        return Promise.resolve(
          jsonResponse({
            ok: true,
            preview_samples: [
              {
                sample_id: 'sample-1',
                input_preview: 'Test input',
                target_preview: 'Test target',
                choices: [],
                metadata: {},
                has_setup: false,
                has_sandbox: false,
                has_files: false,
                parse_status: 'ok',
              },
            ],
            validation_summary: {
              validation_status: 'pass',
              warning_count: 0,
              duplicate_id_count: 0,
              missing_field_count: 0,
              unsupported_payload_count: 0,
              issue_groups: [],
              generated_at: null,
              source_hash: null,
            },
            diff_summary: {},
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
      <MemoryRouter initialEntries={['/app/agchain/datasets/dataset-1/versions/new/draft-1']}>
        <Routes>
          <Route
            path="/app/agchain/datasets/:datasetId/versions/new/:draftId"
            element={<AgchainDatasetVersionDraftPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('loads draft state and shows DRAFT badge', async () => {
    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('DRAFT')).toBeInTheDocument();
    });

    expect(screen.getByText('Based on: version-1')).toBeInTheDocument();
  });

  it('shows field mapping editor with existing mappings', async () => {
    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('Field Mapping')).toBeInTheDocument();
    });

    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.getByText('Common optional')).toBeInTheDocument();
  });

  it('shows materialization options without shuffle_choices', async () => {
    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('Materialization Options')).toBeInTheDocument();
    });

    expect(screen.getByText('Shuffle Data')).toBeInTheDocument();
    expect(screen.getByText('Auto-generate ID')).toBeInTheDocument();
    expect(screen.getByText('Deterministic Seed')).toBeInTheDocument();
    expect(screen.queryByText('Shuffle Choices')).not.toBeInTheDocument();
  });

  it('marks dirty state when editing', async () => {
    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('DRAFT')).toBeInTheDocument();
    });

    const versionInput = screen.getByPlaceholderText('New version label');
    fireEvent.change(versionInput, { target: { value: 'v2-alpha' } });

    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('shows action bar with Save Draft, Preview, and Commit', async () => {
    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('DRAFT')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Save Draft' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Commit' })).toBeInTheDocument();
  });
});
