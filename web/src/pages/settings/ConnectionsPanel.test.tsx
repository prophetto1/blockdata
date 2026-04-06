import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { HeaderCenterProvider } from '@/components/shell/HeaderCenterContext';
import { useAuth } from '@/auth/AuthContext';
import { platformApiFetch } from '@/lib/platformApi';
import ConnectionsPanel, { resetConnectionsCatalogStateForTests } from './ConnectionsPanel';

vi.mock('@/lib/platformApi', () => ({
  platformApiFetch: vi.fn(),
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: vi.fn(),
}));

type MockResponse = {
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
};

function jsonResponse(body: unknown, init: Partial<MockResponse> = {}): MockResponse {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  };
}

const GCS_CONNECTION = {
  id: 'gcs-1',
  provider: 'gcs',
  connection_type: 'gcp_service_account',
  status: 'connected',
  metadata_jsonb: {
    project_id: 'agchain',
    client_email: 'gcs-access-sa@agchain.iam.gserviceaccount.com',
  },
  updated_at: '2026-03-27T00:00:00Z',
} as const;

const ARANGO_CONNECTION = {
  id: 'arango-1',
  provider: 'arangodb',
  connection_type: 'arangodb_credential',
  status: 'connected',
  metadata_jsonb: {
    endpoint: 'https://arangodb.example.com:8529',
    database: '_system',
    username: 'root',
  },
  updated_at: '2026-03-27T00:00:00Z',
} as const;

function renderPanel() {
  render(
    <MemoryRouter initialEntries={['/app/settings/connections']}>
      <HeaderCenterProvider>
        <ConnectionsPanel />
      </HeaderCenterProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(platformApiFetch).mockReset();
  resetConnectionsCatalogStateForTests();
  vi.mocked(useAuth).mockReturnValue({
    loading: false,
    user: { id: 'user-1' },
    session: { access_token: 'token-1' },
    profile: null,
    signIn: vi.fn(),
    signUp: vi.fn(),
    resendSignupConfirmation: vi.fn(),
    signOut: vi.fn(),
    signInWithOAuth: vi.fn(),
  } as unknown as ReturnType<typeof useAuth>);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  resetConnectionsCatalogStateForTests();
});

describe('ConnectionsPanel', () => {
  it('sends the backend-aligned GCS test function name', async () => {
    vi.mocked(platformApiFetch)
      .mockResolvedValueOnce(jsonResponse({ connections: [GCS_CONNECTION] }) as never)
      .mockResolvedValueOnce(jsonResponse({ valid: true, data: { valid: true }, logs: [] }) as never);

    renderPanel();

    expect(await screen.findByText('gcs')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Test' }));

    await waitFor(() => {
      expect(platformApiFetch).toHaveBeenNthCalledWith(
        2,
        '/connections/test',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connection_id: 'gcs-1',
            function_name: 'load_gcs_list_objects',
          }),
        }),
      );
    });

    expect(await screen.findByText('gcs connection test passed.')).toBeInTheDocument();
  });

  it('sends the backend-aligned ArangoDB test function name', async () => {
    vi.mocked(platformApiFetch)
      .mockResolvedValueOnce(jsonResponse({ connections: [ARANGO_CONNECTION] }) as never)
      .mockResolvedValueOnce(jsonResponse({ valid: true, data: { valid: true }, logs: [] }) as never);

    renderPanel();

    expect(await screen.findByText('arangodb')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Test' }));

    await waitFor(() => {
      expect(platformApiFetch).toHaveBeenNthCalledWith(
        2,
        '/connections/test',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connection_id: 'arango-1',
            function_name: 'load_arango_batch_insert',
          }),
        }),
      );
    });

    expect(await screen.findByText('arangodb connection test passed.')).toBeInTheDocument();
  });

  it('reuses the verified connections list after a remount in the same session', async () => {
    vi.mocked(platformApiFetch).mockResolvedValueOnce(
      jsonResponse({ connections: [GCS_CONNECTION, ARANGO_CONNECTION] }) as never,
    );

    const firstRender = render(
      <MemoryRouter initialEntries={['/app/settings/connections']}>
        <HeaderCenterProvider>
          <ConnectionsPanel />
        </HeaderCenterProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('gcs')).toBeInTheDocument();
    expect(screen.getByText('arangodb')).toBeInTheDocument();
    expect(platformApiFetch).toHaveBeenCalledTimes(1);

    firstRender.unmount();

    render(
      <MemoryRouter initialEntries={['/app/settings/connections']}>
        <HeaderCenterProvider>
          <ConnectionsPanel />
        </HeaderCenterProvider>
      </MemoryRouter>,
    );

    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    expect(screen.getByText('gcs')).toBeInTheDocument();
    expect(screen.getByText('arangodb')).toBeInTheDocument();
    expect(platformApiFetch).toHaveBeenCalledTimes(1);
  });
});
