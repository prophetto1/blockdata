import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OperationalReadinessCheckGrid } from './OperationalReadinessCheckGrid';
import type { OperationalReadinessSurface } from '@/lib/operationalReadiness';

const surface: OperationalReadinessSurface = {
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
    {
      check_id: 'blockdata.storage.bucket_config',
      surface_id: 'blockdata',
      category: 'config',
      status: 'ok',
      label: 'Storage bucket config',
      summary: 'Bucket is configured.',
      cause: null,
      cause_confidence: null,
      depends_on: [],
      blocked_by: [],
      available_actions: [],
      verify_after: [],
      next_if_still_failing: [],
      actionability: 'info_only',
      evidence: { has_bucket: true },
      remediation: 'No action required.',
      checked_at: '2026-03-30T16:00:00Z',
    },
  ],
};

const allOkSurface: OperationalReadinessSurface = {
  id: 'shared',
  label: 'Shared',
  summary: { ok: 2, warn: 0, fail: 0, unknown: 0 },
  checks: [
    {
      check_id: 'shared.platform_api.ready',
      surface_id: 'shared',
      category: 'process',
      status: 'ok',
      label: 'Platform API readiness',
      summary: 'Healthy and ready.',
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
    {
      check_id: 'shared.supabase.connectivity',
      surface_id: 'shared',
      category: 'connectivity',
      status: 'ok',
      label: 'Supabase connectivity',
      summary: 'Reachable.',
      cause: null,
      cause_confidence: null,
      depends_on: [],
      blocked_by: [],
      available_actions: [],
      verify_after: [],
      next_if_still_failing: [],
      actionability: 'info_only',
      evidence: { reachable: true },
      remediation: 'No action required.',
      checked_at: '2026-03-30T16:00:00Z',
    },
  ],
};

describe('OperationalReadinessCheckGrid', () => {
  it('renders check labels, summaries, and remediation text', () => {
    render(<OperationalReadinessCheckGrid surface={surface} />);

    expect(screen.getByText('Bucket CORS')).toBeInTheDocument();
    expect(screen.getByText('Browser upload CORS is missing.')).toBeInTheDocument();
    expect(screen.getByText('Apply the browser upload CORS policy to the bucket.')).toBeInTheDocument();
    expect(screen.getByText('Storage bucket config')).toBeInTheDocument();
  });

  it('expands evidence on row click', () => {
    render(<OperationalReadinessCheckGrid surface={surface} />);

    expect(screen.queryByText('Cors Configured')).not.toBeInTheDocument();

    const corsRow = screen.getAllByRole('button', { name: /bucket cors/i });
    fireEvent.click(corsRow[0]!);

    expect(screen.getByText(/evidence/i)).toBeInTheDocument();
    expect(screen.getByText('Cors Configured')).toBeInTheDocument();
  });

  it('auto-expands surfaces with failures and collapses all-ok surfaces', () => {
    const { container } = render(<OperationalReadinessCheckGrid surface={surface} />);
    const failDetails = container.querySelector('details');
    expect(failDetails).toHaveAttribute('open');

    const { container: okContainer } = render(<OperationalReadinessCheckGrid surface={allOkSurface} />);
    const okDetails = okContainer.querySelector('details');
    expect(okDetails).not.toHaveAttribute('open');
  });

  it('renders empty state when no checks returned', () => {
    render(
      <OperationalReadinessCheckGrid
        surface={{ ...surface, checks: [], summary: { ok: 0, warn: 0, fail: 0, unknown: 0 } }}
      />,
    );

    expect(screen.getByText('No checks returned for this surface.')).toBeInTheDocument();
  });
});
