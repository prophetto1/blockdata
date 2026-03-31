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
      cause: 'The bucket does not expose the browser upload origin in the active CORS policy.',
      cause_confidence: 'high',
      depends_on: [
        {
          check_id: 'shared.storage.bucket_exists',
          label: 'Storage bucket exists',
          status: 'ok',
        },
      ],
      blocked_by: [],
      available_actions: [
        {
          action_kind: 'storage_browser_upload_cors_reconcile',
          label: 'Reconcile browser upload CORS',
          description: 'Apply the backend-owned browser upload CORS policy to the target bucket.',
          route: '/admin/runtime/storage/browser-upload-cors/reconcile',
          requires_confirmation: true,
        },
      ],
      verify_after: [
        {
          probe_kind: 'storage_signed_upload',
          label: 'Run signed upload browser probe',
          route: '/admin/runtime/storage/browser-upload/verify',
        },
      ],
      next_if_still_failing: [
        {
          step_kind: 'inspect_dependency',
          label: 'Inspect bucket dependency',
          description: 'Confirm the configured bucket name resolves to the expected environment.',
        },
      ],
      actionability: 'backend_action',
      evidence: { cors_configured: false },
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
      checked_at: '2026-03-30T16:00:00Z',
    },
  ],
};

describe('OperationalReadinessCheckGrid', () => {
  it('renders a compact table with collapsed rows that expand into the locked control-plane composition', () => {
    const { container } = render(<OperationalReadinessCheckGrid surface={surface} />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Check' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Summary' })).toBeInTheDocument();
    expect(container.querySelectorAll('article')).toHaveLength(0);

    expect(screen.queryByText('Cause')).not.toBeInTheDocument();
    expect(screen.queryByText('Available Actions')).not.toBeInTheDocument();
    expect(screen.queryByText('Probe History')).not.toBeInTheDocument();

    const bucketCorsButton = screen.getByRole('button', { name: /bucket cors/i });
    fireEvent.click(bucketCorsButton);

    expect(bucketCorsButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Cause')).toBeInTheDocument();
    expect(screen.getByText('Dependencies')).toBeInTheDocument();
    expect(screen.getByText('Next if still failing')).toBeInTheDocument();
    expect(screen.getByText('Available Actions')).toBeInTheDocument();
    expect(screen.getByText('Verification')).toBeInTheDocument();
    expect(screen.getByText('Probe History')).toBeInTheDocument();
    expect(
      screen.getByText('The bucket does not expose the browser upload origin in the active CORS policy.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Reconcile browser upload CORS')).toBeInTheDocument();
    expect(screen.getByText('Run signed upload browser probe')).toBeInTheDocument();
    expect(screen.getByText('Inspect bucket dependency')).toBeInTheDocument();
    expect(screen.getByText('No probe run recorded yet.')).toBeInTheDocument();

    const failedRow = screen.getByText('Bucket CORS').closest('tr');
    expect(failedRow).toHaveClass('bg-rose-500/5');
  });

  it('renders the empty-state row when no checks are returned', () => {
    render(
      <OperationalReadinessCheckGrid
        surface={{ ...surface, checks: [], summary: { ok: 0, warn: 0, fail: 0, unknown: 0 } }}
      />,
    );

    expect(screen.getByText('No checks returned for this surface in the current snapshot.')).toBeInTheDocument();
  });
});
