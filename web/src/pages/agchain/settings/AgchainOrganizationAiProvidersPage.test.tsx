import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import AgchainOrganizationAiProvidersPage from './AgchainOrganizationAiProvidersPage';

const useAgchainScopeStateMock = vi.fn();
const useOrganizationModelProvidersMock = vi.fn();
const saveOrganizationModelProviderCredentialMock = vi.fn();
const testOrganizationModelProviderCredentialMock = vi.fn();
const deleteOrganizationModelProviderCredentialMock = vi.fn();

vi.mock('@/hooks/agchain/useAgchainScopeState', () => ({
  useAgchainScopeState: () => useAgchainScopeStateMock(),
}));

vi.mock('@/hooks/agchain/useOrganizationModelProviders', () => ({
  useOrganizationModelProviders: (...args: unknown[]) => useOrganizationModelProvidersMock(...args),
}));

vi.mock('@/lib/agchainModelProviderCredentials', () => ({
  saveOrganizationModelProviderCredential: (...args: unknown[]) => saveOrganizationModelProviderCredentialMock(...args),
  testOrganizationModelProviderCredential: (...args: unknown[]) => testOrganizationModelProviderCredentialMock(...args),
  deleteOrganizationModelProviderCredential: (...args: unknown[]) => deleteOrganizationModelProviderCredentialMock(...args),
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
      <div data-testid="organization-provider-surface">
        {props.scope}:{props.rows.length}:{props.loading ? 'loading' : 'ready'}:{props.error ?? 'no-error'}
      </div>
      <button type="button" onClick={() => void props.onSave({ provider_slug: 'anthropic' }, { apiKey: 'secret' })}>
        Save org credential
      </button>
      <button type="button" onClick={() => void props.onTest({ provider_slug: 'anthropic' }, { apiKey: 'secret' })}>
        Test org credential
      </button>
      <button type="button" onClick={() => void props.onDelete({ provider_slug: 'anthropic' })}>
        Delete org credential
      </button>
    </div>
  ),
}));

afterEach(() => {
  cleanup();
});

describe('AgchainOrganizationAiProvidersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAgchainScopeStateMock.mockReturnValue({
      kind: 'ready',
      selectedOrganization: {
        organization_id: 'org-1',
        display_name: 'AGChain',
      },
    });
    useOrganizationModelProvidersMock.mockReturnValue({
      items: [{ provider_slug: 'anthropic' }],
      status: 'ready',
      error: null,
      refresh: vi.fn().mockResolvedValue(undefined),
    });
    saveOrganizationModelProviderCredentialMock.mockResolvedValue(undefined);
    testOrganizationModelProviderCredentialMock.mockResolvedValue({ ok: true });
    deleteOrganizationModelProviderCredentialMock.mockResolvedValue(undefined);
  });

  it('shows the empty-state guard when no organization is selected', () => {
    useAgchainScopeStateMock.mockReturnValue({
      kind: 'no-organization',
    });

    render(
      <MemoryRouter>
        <AgchainOrganizationAiProvidersPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'No organization' })).toBeInTheDocument();
    expect(screen.getByText('Select or create an organization to continue.')).toBeInTheDocument();
  });

  it('wires organization credential actions through the selected organization scope', async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    useOrganizationModelProvidersMock.mockReturnValue({
      items: [{ provider_slug: 'anthropic' }],
      status: 'ready',
      error: null,
      refresh,
    });

    render(
      <MemoryRouter>
        <AgchainOrganizationAiProvidersPage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('agchain-standard-surface')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Organization AI Providers' })).toBeInTheDocument();
    expect(screen.getByTestId('organization-provider-surface')).toHaveTextContent('organization:1:ready:no-error');

    fireEvent.click(screen.getByRole('button', { name: 'Save org credential' }));
    fireEvent.click(screen.getByRole('button', { name: 'Test org credential' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete org credential' }));

    await waitFor(() => {
      expect(saveOrganizationModelProviderCredentialMock).toHaveBeenCalledWith(
        'org-1',
        'anthropic',
        { apiKey: 'secret' },
      );
    });
    expect(testOrganizationModelProviderCredentialMock).toHaveBeenCalledWith(
      'org-1',
      'anthropic',
      { apiKey: 'secret' },
    );
    expect(deleteOrganizationModelProviderCredentialMock).toHaveBeenCalledWith('org-1', 'anthropic');
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
