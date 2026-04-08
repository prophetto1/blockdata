import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { OperationalReadinessCheckGrid } from './OperationalReadinessCheckGrid';
import type {
  OperationalReadinessCheckDetailState,
  OperationalReadinessSurface,
} from '@/lib/operationalReadiness';

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
    expect(screen.getAllByText(/blockdata-user-content-prod/i)).toHaveLength(2);
    expect(screen.getAllByText(/https:\/\/blockdata\.run/i)).toHaveLength(2);
    expect(screen.getByText('Apply the browser upload CORS policy to the bucket.')).toBeInTheDocument();
    expect(screen.getByText('Storage bucket config')).toBeInTheDocument();
  });

  it('starts backend-actionable rows expanded so executable actions are visible from the mounted page', () => {
    render(<OperationalReadinessCheckGrid surface={surface} />);

    const corsRow = screen.getAllByRole('button', { name: /bucket cors/i })[0]!;
    const corsCheck = within(corsRow.closest('[data-part="root"]')!);
    expect(corsRow).toHaveAttribute('aria-expanded', 'true');

    expect(corsCheck.getByText(/evidence/i)).toBeInTheDocument();
    expect(corsCheck.getByText('Bucket Name')).toBeInTheDocument();
    expect(corsCheck.getByText('Available actions')).toBeInTheDocument();
    expect(corsCheck.getByRole('button', { name: 'Reconcile browser upload CORS' })).toBeInTheDocument();
    expect(corsCheck.getByText('Verify after')).toBeInTheDocument();
    expect(corsCheck.getByText('Retry a browser upload from the app')).toBeInTheDocument();
    expect(corsCheck.getByText('Next if still failing')).toBeInTheDocument();
    expect(corsCheck.getByText('Inspect the live bucket policy')).toBeInTheDocument();
  });

  it('renders persisted latest probe/action detail and routes verify requests through the mounted check row', () => {
    const onVerifyCheck = vi.fn();
    const detailStates: Record<string, OperationalReadinessCheckDetailState> = {
      'blockdata.storage.bucket_cors': {
        loading: false,
        verifying: false,
        error: null,
        detail: {
          check: surface.checks[0],
          latest_probe_run: {
            probe_run_id: 'probe-run-1',
            probe_kind: 'readiness_check_verify',
            check_id: 'blockdata.storage.bucket_cors',
            result: 'fail',
            duration_ms: 8.2,
            evidence: { status: 'fail', surface_id: 'blockdata' },
            failure_reason: 'Bucket browser-upload CORS rules are missing or incomplete.',
            created_at: '2026-04-08T16:15:00Z',
          },
          latest_action_run: {
            action_run_id: 'action-run-1',
            action_kind: 'storage_browser_upload_cors_reconcile',
            check_id: 'blockdata.storage.bucket_cors',
            result: 'ok',
            duration_ms: 21.4,
            request: { confirmed: true },
            result_payload: { bucket_name: 'blockdata-user-content-prod' },
            failure_reason: null,
            created_at: '2026-04-08T16:17:00Z',
          },
        },
      },
    };

    render(
      <OperationalReadinessCheckGrid
        surface={surface}
        detailStates={detailStates}
        onVerifyCheck={onVerifyCheck}
      />,
    );

    const corsRow = screen.getAllByRole('button', { name: /bucket cors/i })[0]!;
    const corsCheck = within(corsRow.closest('[data-part="root"]')!);

    expect(corsCheck.getByText('Latest verification')).toBeInTheDocument();
    expect(corsCheck.getByText('Latest backend action')).toBeInTheDocument();
    expect(corsCheck.getByRole('button', { name: 'Verify now' })).toBeInTheDocument();

    expect(onVerifyCheck).not.toHaveBeenCalled();
  });

  it('does not render backend-remediation actions for non-actionable checks', () => {
    render(<OperationalReadinessCheckGrid surface={surface} />);

    const configRow = screen.getAllByRole('button', { name: /storage bucket config/i })[0]!;
    const configCheck = within(configRow.closest('[data-part="root"]')!);

    fireEvent.click(configRow);

    expect(configCheck.queryByText('Available actions')).not.toBeInTheDocument();
    expect(configCheck.queryByRole('button', { name: /reconcile/i })).not.toBeInTheDocument();
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
