import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AgchainSettingsNav } from './AgchainSettingsNav';

afterEach(() => {
  cleanup();
});

describe('AgchainSettingsNav', () => {
  it('renders organization, project, and personal groups', () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/settings/organization/members']}>
        <AgchainSettingsNav />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('Organization')).toBeInTheDocument();
    expect(screen.getByLabelText('Project')).toBeInTheDocument();
    expect(screen.getByLabelText('Personal')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Members' })).toHaveAttribute('href', '/app/agchain/settings/organization/members');
    expect(screen.getByRole('link', { name: /permission groups/i })).toHaveAttribute('href', '/app/agchain/settings/organization/permission-groups');
  });

  it('filters visible nav items from the settings search input', () => {
    render(
      <MemoryRouter initialEntries={['/app/agchain/settings/organization/members']}>
        <AgchainSettingsNav />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByRole('searchbox', { name: /search settings/i }), {
      target: { value: 'bench' },
    });

    expect(screen.getByRole('link', { name: /benchmark definition/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^members$/i })).not.toBeInTheDocument();
  });
});
