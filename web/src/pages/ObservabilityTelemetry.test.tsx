import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Component as ObservabilityTelemetry } from './ObservabilityTelemetry';

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

describe('ObservabilityTelemetry', () => {
  beforeEach(() => {
    platformApiFetchMock.mockReset();
    useShellHeaderTitleMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('loads telemetry status and renders an honest config-backed status page', async () => {
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
        proof_status: 'passing',
        proof_summary: 'Latest telemetry export probe reached the collector and was accepted.',
        latest_export_probe_run: {
          probe_run_id: 'probe-run-1',
          probe_kind: 'telemetry_export_probe',
          check_id: 'observability.telemetry.export',
          result: 'ok',
          created_at: '2026-04-08T18:10:00Z',
          evidence: {
            proof_level: 'collector_ingest',
            request_url: 'http://localhost:4318/v1/traces',
            http_status_code: 200,
          },
        },
      }),
    );

    render(<ObservabilityTelemetry />);

    expect(screen.getByRole('heading', { level: 1, name: 'Telemetry' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('platform-api')).toBeInTheDocument();
    });

    expect(platformApiFetchMock).toHaveBeenCalledWith('/observability/telemetry-status');
    expect(
      screen.getByText(/This page shows configured telemetry status and the latest export-probe result/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/It does not prove sink delivery or trace completeness/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Latest telemetry export probe reached the collector and was accepted./i),
    ).toBeInTheDocument();
    expect(screen.getByText('http://localhost:4318')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'http://localhost:8080' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'http://localhost:16686' })).toBeInTheDocument();
    expect(useShellHeaderTitleMock).toHaveBeenCalledWith({
      title: 'Telemetry',
      breadcrumbs: ['Observability', 'Telemetry'],
    });
  });

  it('renders an actionable error state when telemetry status cannot be loaded', async () => {
    platformApiFetchMock.mockResolvedValueOnce(
      jsonResponse({ detail: 'Telemetry route failed' }, 500),
    );

    render(<ObservabilityTelemetry />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText('Telemetry status unavailable.')).toBeInTheDocument();
    expect(screen.getByText('Telemetry route failed')).toBeInTheDocument();
  });

  it('runs the telemetry export probe and refreshes the latest proof status', async () => {
    platformApiFetchMock
      .mockResolvedValueOnce(
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
          proof_status: 'unverified',
          proof_summary: 'No telemetry export probe has been run yet.',
          latest_export_probe_run: null,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          proof_status: 'passing',
          proof_summary: 'Latest telemetry export probe reached the collector and was accepted.',
          latest_export_probe_run: {
            probe_run_id: 'probe-run-1',
            probe_kind: 'telemetry_export_probe',
            check_id: 'observability.telemetry.export',
            result: 'ok',
          },
        }),
      )
      .mockResolvedValueOnce(
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
          proof_status: 'passing',
          proof_summary: 'Latest telemetry export probe reached the collector and was accepted.',
          latest_export_probe_run: {
            probe_run_id: 'probe-run-1',
            probe_kind: 'telemetry_export_probe',
            check_id: 'observability.telemetry.export',
            result: 'ok',
          },
        }),
      );

    render(<ObservabilityTelemetry />);

    await waitFor(() => {
      expect(screen.getByText(/No telemetry export probe has been run yet./i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Run Export Probe' }));

    await waitFor(() => {
      expect(
        screen.getByText(/Latest telemetry export probe reached the collector and was accepted./i),
      ).toBeInTheDocument();
    });

    expect(platformApiFetchMock).toHaveBeenNthCalledWith(1, '/observability/telemetry-status');
    expect(platformApiFetchMock).toHaveBeenNthCalledWith(
      2,
      '/admin/runtime/telemetry/export/probe',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(platformApiFetchMock).toHaveBeenNthCalledWith(3, '/observability/telemetry-status');
  });
});
