import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PipelineCatalogPanel } from './PipelineCatalogPanel';

describe('PipelineCatalogPanel', () => {
  it('renders the pipeline services landing cards and service links', () => {
    render(
      <MemoryRouter>
        <PipelineCatalogPanel
          services={[
            {
              slug: 'index-builder',
              label: 'Index Builder',
              description: 'Upload owned markdown sources, persist ordered source sets, queue backend processing, and produce downloadable lexical and semantic retrieval packages.',
              pipelineKind: 'markdown_index_builder',
              eligibleSourceTypes: ['md', 'markdown'],
              deliverableKinds: ['lexical_sqlite', 'semantic_zip'],
            },
          ]}
          loading={false}
          error={null}
          probePanel={<div>Proof panel placeholder</div>}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Pipeline Services' })).toBeInTheDocument();
    expect(screen.getByText('Open a dedicated workbench for each service from the catalog below.')).toBeInTheDocument();
    expect(screen.getByText('Proof panel placeholder')).toBeInTheDocument();
    expect(screen.getByText('markdown_index_builder')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Index Builder' })).toHaveAttribute('href', '/app/pipeline-services/index-builder');
  });
});
