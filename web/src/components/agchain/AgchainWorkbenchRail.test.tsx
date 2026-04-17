import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { AgchainWorkbenchRail } from './AgchainWorkbenchRail';

afterEach(() => {
  cleanup();
});

describe('AgchainWorkbenchRail', () => {
  it('renders a snapped icon-only workbench rail without logo or project pickers', () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/eval-designer']}>
        <AgchainWorkbenchRail />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Block')).not.toBeInTheDocument();
    expect(screen.queryByText('Data')).not.toBeInTheDocument();
    expect(screen.queryByText('Workbench')).not.toBeInTheDocument();
    expect(screen.queryByText('Designers')).not.toBeInTheDocument();
    expect(screen.queryByText('Personal Workspace')).not.toBeInTheDocument();
    expect(screen.queryByText('Select project')).not.toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Eval Designer' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Harness Designer' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to AGChain' })).toBeInTheDocument();

    expect(screen.queryByText('Eval Designer')).not.toBeInTheDocument();
    expect(screen.queryByText('Harness Designer')).not.toBeInTheDocument();
    expect(screen.queryByText('Back to AGChain')).not.toBeInTheDocument();
  });
});
