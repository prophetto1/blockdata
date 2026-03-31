import { render, screen } from '@testing-library/react';
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
    bootstrap: {
      diagnosis_kind: 'ready',
      diagnosis_title: 'Ready',
      diagnosis_summary: 'Bootstrap passed.',
      snapshot_available: true,
      base_mode: 'relative_proxy',
      frontend_origin: 'http://localhost:5374',
      platform_api_target: '/platform-api',
      probes: [],
    },
    summary: { ok: 4, warn: 1, fail: 1, unknown: 0 },
    surfaces: [
      {
        id: 'shared',
        label: 'Shared',
        summary: { ok: 2, warn: 1, fail: 0, unknown: 0 },
        checks: [
          {
            check_id: 'shared.platform_api.ready',
            surface_id: 'shared',
            category: 'process',
            status: 'ok',
            label: 'Platform API readiness',
            summary: 'Platform API process is healthy and ready.',
            cause: null,
            cause_confidence: null,
            depends_on: [],
            blocked_by: [],
            available_actions: [],
            verify_after: [],
            next_if_still_failing: [],
            actionability: 'info_only',
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
            check_id: 'blockdata.storage.bucket_cors',
            surface_id: 'blockdata',
            category: 'connectivity',
            status: 'fail',
            label: 'Bucket CORS',
            summary: 'Browser upload CORS is missing.',
            cause: null,
            cause_confidence: null,
            depends_on: [],
            blocked_by: [],
            available_actions: [],
            verify_after: [],
            next_if_still_failing: [],
            actionability: 'info_only',
            evidence: { cors_configured: false },
            remediation: 'Apply the browser upload CORS policy to the bucket.',
            checked_at: '2026-03-30T16:00:00Z',
          },
        ],
      },
      {
        id: 'agchain',
        label: 'AGChain',
        summary: { ok: 1, warn: 0, fail: 0, unknown: 0 },
        checks: [],
      },
    ],
    clientDiagnostics: [
      {
        id: 'client.origin',
        label: 'Frontend Origin',
        value: 'http://localhost:5374',
        summary: 'Current browser origin for this session.',
      },
    ],
    refresh: refreshMock,
  }),
}));

describe('SuperuserOperationalReadiness', () => {
  it('renders the operator dashboard with header, summary, surfaces, and client panel', () => {
    render(<SuperuserOperationalReadiness />);

    expect(screen.getByRole('heading', { level: 1, name: 'Operational Readiness' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh Status' })).toBeInTheDocument();

    // Bootstrap shows ready state
    expect(screen.getByText('Snapshot loaded')).toBeInTheDocument();

    // Summary counters
    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.getByText('WARN')).toBeInTheDocument();
    expect(screen.getByText('FAIL')).toBeInTheDocument();

    // Surfaces render in order
    expect(screen.getByText('Platform API readiness')).toBeInTheDocument();
    expect(screen.getByText('Bucket CORS')).toBeInTheDocument();

    // Remediation visible for failed check
    expect(screen.getByText('Apply the browser upload CORS policy to the bucket.')).toBeInTheDocument();

    // Client panel
    expect(screen.getByText('Client Environment')).toBeInTheDocument();
    expect(screen.getByText('Frontend Origin')).toBeInTheDocument();
  });
});
