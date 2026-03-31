import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import PipelineServicesPage from './PipelineServicesPage';

const platformApiFetchMock = vi.fn();
const useShellHeaderTitleMock = vi.fn();

vi.mock('@/lib/platformApi', () => ({
  platformApiFetch: (...args: unknown[]) => platformApiFetchMock(...args),
}));

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: (...args: unknown[]) => useShellHeaderTitleMock(...args),
}));

afterEach(() => {
  cleanup();
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderAt(pathname: string) {
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <Routes>
        <Route path="/app/pipeline-services" element={<PipelineServicesPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PipelineServicesPage', () => {
  beforeEach(() => {
    platformApiFetchMock.mockReset();
    useShellHeaderTitleMock.mockReset();
    platformApiFetchMock.mockResolvedValue(
      jsonResponse({
        items: [
          {
            pipeline_kind: 'markdown_index_builder',
            label: 'Index Builder',
            supports_manual_trigger: true,
            eligible_source_types: ['md', 'markdown'],
            deliverable_kinds: ['lexical_sqlite', 'semantic_zip'],
          },
        ],
      }),
    );
  });

  it('renders the pipeline services landing surface and loads definitions', async () => {
    renderAt('/app/pipeline-services');

    expect(screen.getByRole('heading', { name: 'Pipeline Services' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Open Index Builder' })).toBeInTheDocument();
    });

    expect(platformApiFetchMock).toHaveBeenCalledWith('/pipelines/definitions');
    expect(screen.getByText('Upload owned markdown sources, persist ordered source sets, queue backend processing, and produce downloadable lexical and semantic retrieval packages.')).toBeInTheDocument();
    expect(useShellHeaderTitleMock).toHaveBeenCalledWith({
      breadcrumbs: ['Pipeline Services'],
    });
  });

  it('renders overview content directly with no workbench tab chrome', async () => {
    renderAt('/app/pipeline-services');

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Open Index Builder' })).toBeInTheDocument();
    });

    expect(screen.queryByText('Service Overview')).not.toBeInTheDocument();
    expect(screen.queryByText('Runs & Downloads')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Upload' })).not.toBeInTheDocument();
  });
});
