import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import AgchainAiProvidersPage from './AgchainAiProvidersPage';

const useAgchainScopeStateMock = vi.fn();
const useProjectModelProvidersMock = vi.fn();
const saveProjectModelProviderCredentialMock = vi.fn();
const testProjectModelProviderCredentialMock = vi.fn();
const deleteProjectModelProviderCredentialMock = vi.fn();

vi.mock('@/hooks/agchain/useAgchainScopeState', () => ({
  useAgchainScopeState: () => useAgchainScopeStateMock(),
}));

vi.mock('@/hooks/agchain/useProjectModelProviders', () => ({
  useProjectModelProviders: (...args: unknown[]) => useProjectModelProvidersMock(...args),
}));

vi.mock('@/lib/agchainModelProviderCredentials', () => ({
  saveProjectModelProviderCredential: (...args: unknown[]) => saveProjectModelProviderCredentialMock(...args),
  testProjectModelProviderCredential: (...args: unknown[]) => testProjectModelProviderCredentialMock(...args),
  deleteProjectModelProviderCredential: (...args: unknown[]) => deleteProjectModelProviderCredentialMock(...args),
}));

vi.mock('@/components/agchain/models/AgchainProviderCredentialsSurface', () => ({
  AgchainProviderCredentialsSurface: (props: {
    scope: string;
    rows: Array<{ provider_slug: string }>;
    loading: boolean;
    error: string | null;
    onSave: (provider: { provider_slug: string }, payload: { apiKey: string }) => Promise<void>;
    onTest: (provider: { provider_slug: string }, payload: { apiKey: string }) => Promise<unknown>;
    onDelete: (provider: { provider_slug: string }) => Promise<void>;
  }) => (
    <div>
      <div data-testid="project-provider-surface">
        {props.scope}:{props.rows.length}:{props.loading ? 'loading' : 'ready'}:{props.error ?? 'no-error'}
      </div>
      <button type="button" onClick={() => void props.onSave({ provider_slug: 'openai' }, { apiKey: 'secret' })}>
        Save credential
      </button>
      <button type="button" onClick={() => void props.onTest({ provider_slug: 'openai' }, { apiKey: 'secret' })}>
        Test credential
      </button>
      <button type="button" onClick={() => void props.onDelete({ provider_slug: 'openai' })}>
        Delete credential
      </button>
    </div>
  ),
}));

afterEach(() => {
  cleanup();
});

describe('AgchainAiProvidersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAgchainScopeStateMock.mockReturnValue({
      kind: 'ready',
      focusedProject: {
        project_id: 'project-1',
      },
    });
    useProjectModelProvidersMock.mockReturnValue({
      items: [{ provider_slug: 'openai' }],
      status: 'ready',
      error: null,
      refresh: vi.fn().mockResolvedValue(undefined),
    });
    saveProjectModelProviderCredentialMock.mockResolvedValue(undefined);
    testProjectModelProviderCredentialMock.mockResolvedValue({ ok: true });
    deleteProjectModelProviderCredentialMock.mockResolvedValue(undefined);
  });

  it('routes users back to the project registry when no AGChain project is selected', () => {
    useAgchainScopeStateMock.mockReturnValue({
      kind: 'no-project',
      selectedOrganization: {
        organization_id: 'org-1',
        display_name: 'AGChain',
      },
    });

    render(
      <MemoryRouter>
        <AgchainAiProvidersPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Choose an AGChain project' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open project registry' })).toHaveAttribute('href', '/app/agchain/projects');
  });

  it('wires provider credential actions through the focused project scope', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    useProjectModelProvidersMock.mockReturnValue({
      items: [{ provider_slug: 'openai' }],
      status: 'ready',
      error: null,
      refresh,
    });

    render(
      <MemoryRouter>
        <AgchainAiProvidersPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'AI Providers' })).toBeInTheDocument();
    expect(screen.getByTestId('project-provider-surface')).toHaveTextContent('project:1:ready:no-error');

    fireEvent.click(screen.getByRole('button', { name: 'Save credential' }));
    fireEvent.click(screen.getByRole('button', { name: 'Test credential' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete credential' }));

    await waitFor(() => {
      expect(saveProjectModelProviderCredentialMock).toHaveBeenCalledWith(
        'project-1',
        'openai',
        { apiKey: 'secret' },
      );
    });
    expect(testProjectModelProviderCredentialMock).toHaveBeenCalledWith(
      'project-1',
      'openai',
      { apiKey: 'secret' },
    );
    expect(deleteProjectModelProviderCredentialMock).toHaveBeenCalledWith('project-1', 'openai');
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
