import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AgchainDatasetCreatePage from './AgchainDatasetCreatePage';

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

const BOOTSTRAP_RESPONSE = {
  allowed_source_types: ['csv', 'json', 'jsonl', 'huggingface'],
  field_spec_defaults: {
    input: null, messages: null, choices: null, target: null,
    id: null, metadata: null, sandbox: null, files: null, setup: null,
  },
  source_config_defaults: {},
  materialization_defaults: {
    shuffle: false, shuffle_choices: false, limit: null, auto_id: false, deterministic_seed: null,
  },
  upload_limits: {},
  validation_rules: {},
};

const PREVIEW_RESPONSE = {
  ok: true,
  preview_id: 'preview-1',
  sample_count: 2,
  preview_samples: [
    {
      sample_id: 'sample-1',
      input_preview: 'What is contract law?',
      target_preview: 'Contract law governs...',
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
    generated_at: '2026-04-01T00:00:00Z',
    source_hash: 'sha256:abc',
  },
  field_resolution_summary: {},
};

describe('AgchainDatasetCreatePage', () => {
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

    platformApiFetchMock.mockImplementation((path: string, init?: RequestInit) => {
      if (path.startsWith('/agchain/datasets/new/bootstrap')) {
        return Promise.resolve(jsonResponse(BOOTSTRAP_RESPONSE));
      }
      if (path === '/agchain/datasets/new/preview' && init?.method === 'POST') {
        return Promise.resolve(jsonResponse(PREVIEW_RESPONSE));
      }
      if (path === '/agchain/datasets' && init?.method === 'POST') {
        return Promise.resolve(
          jsonResponse({
            ok: true,
            dataset: { dataset_id: 'dataset-new', slug: 'test-dataset', name: 'Test Dataset' },
            version: { dataset_version_id: 'version-1', version_label: 'v1' },
          }),
        );
      }
      return Promise.reject(new Error(`Unhandled: ${path}`));
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the wizard with source step as default', async () => {
    render(
      <MemoryRouter>
        <AgchainDatasetCreatePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Add Dataset' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Source Configuration')).toBeInTheDocument();
    });

    expect(screen.getByText('1. Source')).toBeInTheDocument();
    expect(screen.getByText('2. Mapping')).toBeInTheDocument();
    expect(screen.getByText('3. Preview')).toBeInTheDocument();
    expect(screen.getByText('4. Details')).toBeInTheDocument();
  });

  it('navigates through wizard steps', async () => {
    render(
      <MemoryRouter>
        <AgchainDatasetCreatePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Source Configuration')).toBeInTheDocument();
    });

    // Go to mapping
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Field Mapping')).toBeInTheDocument();

    // Go to preview (triggers preview call)
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Dataset Preview')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('What is contract law?')).toBeInTheDocument();
    });

    // Go to details
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Name and Submit')).toBeInTheDocument();

    // Go back
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Dataset Preview')).toBeInTheDocument();
  });

  it('shows field mapping with three-tier grouping', async () => {
    render(
      <MemoryRouter>
        <AgchainDatasetCreatePage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Source Configuration')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('2. Mapping'));

    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.getByText('Common optional')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
    expect(screen.getByText('User prompt or query')).toBeInTheDocument();
    expect(screen.getByText('Desired output or ground truth')).toBeInTheDocument();
  });
});
