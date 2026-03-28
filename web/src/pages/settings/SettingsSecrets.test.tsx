import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import { HeaderCenterProvider, useHeaderCenter } from '@/components/shell/HeaderCenterContext';
import {
  createSecret,
  deleteSecret,
  listSecrets,
  updateSecret,
} from '@/lib/secretsApi';
import SecretsPage from '@/pages/SecretsPage';
import SettingsSecrets from './SettingsSecrets';

vi.mock('@/lib/secretsApi', () => ({
  listSecrets: vi.fn(),
  createSecret: vi.fn(),
  updateSecret: vi.fn(),
  deleteSecret: vi.fn(),
}));

const BASE_SECRET = {
  id: 'secret-1',
  name: 'OPENAI_API_KEY',
  description: 'OpenAI key',
  value_kind: 'api_key',
  value_suffix: '....1234',
  created_at: '2026-03-27T00:00:00Z',
  updated_at: '2026-03-27T00:00:00Z',
} as const;

const SECOND_SECRET = {
  id: 'secret-2',
  name: 'GITHUB_TOKEN',
  description: 'GitHub token',
  value_kind: 'token',
  value_suffix: '....7890',
  created_at: '2026-03-27T01:00:00Z',
  updated_at: '2026-03-27T01:00:00Z',
} as const;

function HeaderCenterReader() {
  const { center } = useHeaderCenter();
  return <div data-testid="header-center">{center}</div>;
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

beforeEach(() => {
  vi.mocked(listSecrets).mockReset();
  vi.mocked(createSecret).mockReset();
  vi.mocked(updateSecret).mockReset();
  vi.mocked(deleteSecret).mockReset();
  vi.mocked(listSecrets).mockResolvedValue([BASE_SECRET]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SettingsSecrets', () => {
  it('renders the canonical settings secrets surface and breadcrumb', async () => {
    render(
      <MemoryRouter initialEntries={['/app/settings/secrets']}>
        <HeaderCenterProvider>
          <SettingsSecrets />
          <HeaderCenterReader />
        </HeaderCenterProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('OPENAI_API_KEY')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Secrets' })).toBeInTheDocument();
    expect(screen.getByTestId('header-center')).toHaveTextContent('Settings');
    expect(screen.getByTestId('header-center')).toHaveTextContent('Secrets');
    expect(screen.queryByText('Variables')).not.toBeInTheDocument();
  });

  it('creates a secret and reloads the metadata list', async () => {
    vi.mocked(listSecrets)
      .mockResolvedValueOnce([BASE_SECRET])
      .mockResolvedValueOnce([SECOND_SECRET, BASE_SECRET]);
    vi.mocked(createSecret).mockResolvedValue(SECOND_SECRET);

    render(
      <MemoryRouter initialEntries={['/app/settings/secrets']}>
        <HeaderCenterProvider>
          <SettingsSecrets />
        </HeaderCenterProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('OPENAI_API_KEY')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'New Secret' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'github_token' } });
    fireEvent.change(screen.getByLabelText('Value'), { target: { value: 'ghp-secret-7890' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'GitHub token' } });
    fireEvent.change(screen.getByLabelText('Value Type'), { target: { value: 'token' } });
    fireEvent.submit(screen.getByLabelText('Value').closest('form')!);

    await waitFor(() => {
      expect(createSecret).toHaveBeenCalledWith({
        name: 'github_token',
        value: 'ghp-secret-7890',
        description: 'GitHub token',
        value_kind: 'token',
      });
    });
    expect(await screen.findByText('GITHUB_TOKEN')).toBeInTheDocument();
  });

  it('updates a secret and refreshes the rendered metadata', async () => {
    vi.mocked(listSecrets)
      .mockResolvedValueOnce([BASE_SECRET])
      .mockResolvedValueOnce([
        {
          ...BASE_SECRET,
          description: 'Rotated key',
          value_kind: 'client_secret',
          value_suffix: '....5678',
        },
      ]);
    vi.mocked(updateSecret).mockResolvedValue({
      ...BASE_SECRET,
      description: 'Rotated key',
      value_kind: 'client_secret',
      value_suffix: '....5678',
    });

    render(
      <MemoryRouter initialEntries={['/app/settings/secrets']}>
        <HeaderCenterProvider>
          <SettingsSecrets />
        </HeaderCenterProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('OPENAI_API_KEY')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit OPENAI_API_KEY' }));
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Rotated key' } });
    fireEvent.change(screen.getByLabelText('Value'), { target: { value: 'sk-rotated-5678' } });
    fireEvent.change(screen.getByLabelText('Value Type'), { target: { value: 'client_secret' } });
    fireEvent.submit(screen.getByLabelText('Value').closest('form')!);

    await waitFor(() => {
      expect(updateSecret).toHaveBeenCalledWith('secret-1', {
        description: 'Rotated key',
        value: 'sk-rotated-5678',
        value_kind: 'client_secret',
      });
    });
    expect(await screen.findByText('Rotated key')).toBeInTheDocument();
  });

  it('deletes a secret and reloads the table', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(listSecrets)
      .mockResolvedValueOnce([BASE_SECRET])
      .mockResolvedValueOnce([]);
    vi.mocked(deleteSecret).mockResolvedValue({ ok: true, id: 'secret-1' });

    render(
      <MemoryRouter initialEntries={['/app/settings/secrets']}>
        <HeaderCenterProvider>
          <SettingsSecrets />
        </HeaderCenterProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('OPENAI_API_KEY')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete OPENAI_API_KEY' }));

    await waitFor(() => {
      expect(deleteSecret).toHaveBeenCalledWith('secret-1');
    });
    expect(await screen.findByText('No secrets configured yet.')).toBeInTheDocument();
    expect(confirmSpy).toHaveBeenCalledWith('Delete OPENAI_API_KEY? This cannot be undone.');
  });

  it('does not delete a secret when confirmation is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={['/app/settings/secrets']}>
        <HeaderCenterProvider>
          <SettingsSecrets />
        </HeaderCenterProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('OPENAI_API_KEY')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete OPENAI_API_KEY' }));

    await waitFor(() => {
      expect(deleteSecret).not.toHaveBeenCalled();
    });
    expect(screen.getByText('OPENAI_API_KEY')).toBeInTheDocument();
  });

  it('keeps /app/secrets as a compatibility redirect to /app/settings/secrets', async () => {
    render(
      <MemoryRouter initialEntries={['/app/secrets']}>
        <Routes>
          <Route path="/app/secrets" element={<SecretsPage />} />
          <Route path="/app/settings/secrets" element={<div>Settings Secrets</div>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/app/settings/secrets');
    });
    expect(screen.getByText('Settings Secrets')).toBeInTheDocument();
  });
});
