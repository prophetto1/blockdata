import { cleanup, render, screen, waitFor } from '@testing-library/react';
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
      }),
    );

    render(<ObservabilityTelemetry />);

    expect(screen.getByRole('heading', { level: 1, name: 'Telemetry' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('platform-api')).toBeInTheDocument();
    });

    expect(platformApiFetchMock).toHaveBeenCalledWith('/observability/telemetry-status');
    expect(
      screen.getByText(/This page reports configured telemetry status from the platform API/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/It does not prove successful OTLP export or collector ingest/i),
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
});
