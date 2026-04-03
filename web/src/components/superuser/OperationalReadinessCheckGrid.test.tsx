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
      cause: 'The configured bucket does not expose the browser upload origins required by the live app.',
      cause_confidence: 'high',
      depends_on: [],
      blocked_by: [],
      available_actions: [
        {
          action_kind: 'storage_browser_upload_cors_reconcile',
          label: 'Reconcile browser upload CORS',
          description: 'Apply the checked-in bucket CORS artifact to the configured storage bucket.',
          route: '/admin/runtime/storage/browser-upload-cors/reconcile',
          requires_confirmation: true,
        },
      ],
      verify_after: [
        {
          probe_kind: 'pipeline_services_browser_upload',
          label: 'Retry a browser upload from the app',
          route: '/admin/runtime/readiness?surface=blockdata',
        },
      ],
      next_if_still_failing: [
        {
          step_kind: 'manual_fix',
          label: 'Inspect the live bucket policy',
          description: 'Compare the live bucket CORS rules with the checked-in artifact and deployed origins.',
        },
      ],
      actionability: 'backend_action',
      evidence: {
        bucket_name: 'blockdata-user-content-prod',
        cors_rule_count: 1,
        allowed_origins: ['http://localhost:5374', 'https://blockdata.run'],
        allowed_methods: ['PUT', 'GET', 'HEAD', 'OPTIONS'],
        allowed_response_headers: ['Content-Type', 'Content-Disposition', 'ETag', 'x-goog-resumable'],
      },
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
  it('renders check labels, summaries, cause text, key facts, and remediation text', () => {
    render(<OperationalReadinessCheckGrid surface={surface} />);

    expect(screen.getByText('Bucket CORS')).toBeInTheDocument();
    expect(screen.getByText('Browser upload CORS is missing.')).toBeInTheDocument();
    expect(screen.getByText(/Cause:/i)).toBeInTheDocument();
    expect(screen.getByText(/does not expose the browser upload origins required by the live app/i)).toBeInTheDocument();
    expect(screen.getByText(/Key facts:/i)).toBeInTheDocument();
    expect(screen.getByText(/blockdata-user-content-prod/i)).toBeInTheDocument();
    expect(screen.getByText(/https:\/\/blockdata\.run/i)).toBeInTheDocument();
    expect(screen.getByText('Apply the browser upload CORS policy to the bucket.')).toBeInTheDocument();
    expect(screen.getByText('Storage bucket config')).toBeInTheDocument();
  });

  it('expands evidence, actions, and verification guidance on row click', () => {
    render(<OperationalReadinessCheckGrid surface={surface} />);

    expect(screen.queryByText('Available actions')).not.toBeInTheDocument();

    const corsRow = screen.getAllByRole('button', { name: /bucket cors/i });
    fireEvent.click(corsRow[0]!);

    expect(screen.getByText(/evidence/i)).toBeInTheDocument();
    expect(screen.getByText('Bucket Name')).toBeInTheDocument();
    expect(screen.getByText('Available actions')).toBeInTheDocument();
    expect(screen.getByText('Reconcile browser upload CORS')).toBeInTheDocument();
    expect(screen.getByText('Verify after')).toBeInTheDocument();
    expect(screen.getByText('Retry a browser upload from the app')).toBeInTheDocument();
    expect(screen.getByText('Next if still failing')).toBeInTheDocument();
    expect(screen.getByText('Inspect the live bucket policy')).toBeInTheDocument();
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
