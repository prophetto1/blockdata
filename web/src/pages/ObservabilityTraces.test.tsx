import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Component as ObservabilityTraces } from './ObservabilityTraces';

const platformApiFetchMock = vi.fn();
const useShellHeaderTitleMock = vi.fn();

vi.mock('@/lib/platformApi', () => ({
  platformApiFetch: (...args: unknown[]) => platformApiFetchMock(...args),
}));

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: (...args: unknown[]) => useShellHeaderTitleMock(...args),
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('ObservabilityTraces', () => {
  beforeEach(() => {
    platformApiFetchMock.mockReset();
    useShellHeaderTitleMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('loads the latest telemetry proof state and trace inspector links', async () => {
    platformApiFetchMock.mockResolvedValueOnce(
      jsonResponse({
        enabled: true,
        service_name: 'platform-api',
        service_namespace: 'agchain',
        deployment_environment: 'local',
        otlp_endpoint: 'http://localhost:4318',
        protocol: 'http/protobuf',
        sampler: 'parentbased_traceidratio',
        sampler_arg: 1,
        log_correlation: true,
        metrics_enabled: true,
        logs_enabled: true,
        signoz_ui_url: 'http://localhost:8080',
        jaeger_ui_url: 'http://localhost:16686',
        proof_status: 'failing',
        proof_summary: 'Latest telemetry export probe failed before the collector accepted the trace payload.',
        latest_export_probe_run: {
          probe_run_id: 'probe-run-1',
          probe_kind: 'telemetry_export_probe',
          check_id: 'observability.telemetry.export',
          result: 'error',
          created_at: '2026-04-08T18:12:00Z',
          failure_reason: 'ConnectError',
        },
      }),
    );

    render(<ObservabilityTraces />);

    expect(screen.getByRole('heading', { level: 1, name: 'Traces' })).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText(/Latest telemetry export probe failed before the collector accepted the trace payload./i),
      ).toBeInTheDocument();
    });

    expect(platformApiFetchMock).toHaveBeenCalledWith('/observability/telemetry-status');
    expect(screen.getByRole('link', { name: 'http://localhost:8080' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'http://localhost:16686' })).toBeInTheDocument();
    expect(useShellHeaderTitleMock).toHaveBeenCalledWith({
      title: 'Traces',
      breadcrumbs: ['Observability', 'Traces'],
    });
  });

  it('renders an error state when the trace proof status cannot be loaded', async () => {
    platformApiFetchMock.mockResolvedValueOnce(
      jsonResponse({ detail: 'Trace proof route failed' }, 500),
    );

    render(<ObservabilityTraces />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText('Trace proof status unavailable.')).toBeInTheDocument();
    expect(screen.getByText('Trace proof route failed')).toBeInTheDocument();
  });
});
