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
      id: 'blockdata.storage.bucket_cors',
      category: 'connectivity',
      status: 'fail',
      label: 'Bucket CORS',
      summary: 'Browser upload CORS is missing.',
      evidence: { cors_configured: false },
      remediation: 'Apply browser upload CORS rules to the bucket.',
      checked_at: '2026-03-30T16:00:00Z',
    },
    {
      id: 'blockdata.storage.bucket_config',
      category: 'config',
      status: 'ok',
      label: 'Storage bucket config',
      summary: 'Bucket is configured.',
      evidence: { has_bucket: true },
      remediation: 'No action required.',
      checked_at: '2026-03-30T16:00:00Z',
    },
  ],
};

describe('OperationalReadinessCheckGrid', () => {
  it('renders a compact table with collapsed rows that expand for evidence and remediation', () => {
    const { container } = render(<OperationalReadinessCheckGrid surface={surface} />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Check' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Summary' })).toBeInTheDocument();
    expect(container.querySelectorAll('article')).toHaveLength(0);

    expect(screen.queryByText('Evidence')).not.toBeInTheDocument();
    expect(screen.queryByText('Remediation')).not.toBeInTheDocument();

    const bucketCorsButton = screen.getByRole('button', { name: /bucket cors/i });
    fireEvent.click(bucketCorsButton);

    expect(screen.getByText('Evidence')).toBeInTheDocument();
    expect(screen.getByText('Remediation')).toBeInTheDocument();
    expect(screen.getByText('Apply browser upload CORS rules to the bucket.')).toBeInTheDocument();

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
