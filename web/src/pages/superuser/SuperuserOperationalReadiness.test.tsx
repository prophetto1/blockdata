import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Component as SuperuserOperationalReadiness } from './SuperuserOperationalReadiness';

const refreshMock = vi.fn();

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: vi.fn(),
}));

vi.mock('@/hooks/useOperationalReadiness', () => ({
  useOperationalReadiness: () => ({
    loading: false,
    refreshing: false,
    error: null,
    refreshedAt: '2026-03-30T16:00:00Z',
    summary: { ok: 4, warn: 1, fail: 2, unknown: 1 },
    surfaces: [
      {
        id: 'shared',
        label: 'Shared',
        summary: { ok: 2, warn: 1, fail: 1, unknown: 0 },
        checks: [
          {
            id: 'shared.platform_api.ready',
            category: 'process',
            status: 'ok',
            label: 'Platform API readiness',
            summary: 'Platform API process is healthy and ready.',
            evidence: { ready: true },
            remediation: 'No action required.',
            checked_at: '2026-03-30T16:00:00Z',
          },
        ],
      },
      {
        id: 'blockdata',
        label: 'BlockData',
        summary: { ok: 1, warn: 0, fail: 1, unknown: 0 },
        checks: [
          {
            id: 'blockdata.storage.bucket_cors',
            category: 'connectivity',
            status: 'fail',
            label: 'Bucket CORS',
            summary: 'Browser upload CORS is missing for the configured bucket.',
            evidence: { cors_configured: false },
            remediation: 'Apply browser upload CORS rules to the bucket.',
            checked_at: '2026-03-30T16:00:00Z',
          },
        ],
      },
      {
        id: 'agchain',
        label: 'AGChain',
        summary: { ok: 1, warn: 0, fail: 0, unknown: 1 },
        checks: [
          {
            id: 'agchain.models.targets',
            category: 'product',
            status: 'unknown',
            label: 'Model targets',
            summary: 'Model target readiness could not be determined safely.',
            evidence: { total: null },
            remediation: 'Retry after confirming AGChain model registry availability.',
            checked_at: '2026-03-30T16:00:00Z',
          },
        ],
      },
    ],
    clientDiagnostics: [
      {
        id: 'client.origin',
        label: 'Frontend Origin',
        value: 'http://localhost:5374',
        summary: 'Current browser origin for this session.',
      },
      {
        id: 'client.platform_api_base_mode',
        label: 'Platform API Base Mode',
        value: 'relative /platform-api',
        summary: 'Resolved platform API base mode in the frontend.',
      },
      {
        id: 'client.auth_bypass',
        label: 'Auth Bypass Mode',
        value: 'disabled',
        summary: 'Frontend auth bypass flag state.',
      },
    ],
    refresh: refreshMock,
  }),
}));

describe('SuperuserOperationalReadiness', () => {
  it('renders the locked operator dashboard contract', () => {
    render(<SuperuserOperationalReadiness />);

    expect(screen.getByRole('heading', { level: 1, name: 'Operational Readiness' })).toBeInTheDocument();
    expect(screen.getByText(/see what is working vs not working before debugging a flow/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh Status' })).toBeInTheDocument();

    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.getByText('WARN')).toBeInTheDocument();
    expect(screen.getByText('FAIL')).toBeInTheDocument();
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
    expect(screen.getByText(/last refresh/i)).toBeInTheDocument();

    const sharedHeading = screen.getByRole('heading', { level: 2, name: 'Shared' });
    const blockdataHeading = screen.getByRole('heading', { level: 2, name: 'BlockData' });
    const agchainHeading = screen.getByRole('heading', { level: 2, name: 'AGChain' });
    expect(sharedHeading.compareDocumentPosition(blockdataHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(blockdataHeading.compareDocumentPosition(agchainHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(screen.getByText('Platform API readiness')).toBeInTheDocument();
    expect(screen.getByText('Platform API process is healthy and ready.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /platform api readiness/i }));
    expect(screen.getByText((value, element) => element?.tagName === 'DT' && value === 'ready')).toBeInTheDocument();
    expect(screen.getByText('No action required.')).toBeInTheDocument();

    const clientPanelHeading = screen.getByRole('heading', { level: 2, name: 'Client Environment' });
    expect(agchainHeading.compareDocumentPosition(clientPanelHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('Frontend Origin')).toBeInTheDocument();
    expect(screen.getByText('Platform API Base Mode')).toBeInTheDocument();
    expect(screen.getByText('Auth Bypass Mode')).toBeInTheDocument();
  });
});
