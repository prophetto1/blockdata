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
              description: 'Build lexical and semantic retrieval packages from markdown sources.',
              pipelineKind: 'markdown_index_builder',
              eligibleSourceTypes: ['md', 'markdown'],
              deliverableKinds: ['lexical_sqlite', 'semantic_zip'],
            },
          ]}
          loading={false}
          error={null}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Pipeline Services' })).toBeInTheDocument();
    expect(screen.getByText('markdown_index_builder')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Index Builder' })).toHaveAttribute('href', '/app/pipeline-services/index-builder');
  });
});
