import { featureFlags } from '@/lib/featureFlags';
import { platformApiFetch } from '@/lib/platformApi';
import type {
  LogQuery,
  ObservabilityApiClient,
  ObservabilityRealtimeTransport,
  PagedResult,
  StopStream,
} from './types';
import type {
  LogLevel,
  LogRecord,
  ObservabilityStatus,
  Span,
  SpanStatus,
  Trace,
  TraceTimelinePoint,
} from '../types';

type AnyRecord = Record<string, unknown>;

const DEFAULT_POLL_MS = Math.max(featureFlags.observabilityPollMs || 5000, 1000);

function isObject(value: unknown): value is AnyRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback = ''): string {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return fallback;
}

function readBooleanish(value: unknown, fallback = false): boolean {
  const raw = readString(value, '').toLowerCase();
  if (raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on') return true;
  if (raw === 'false' || raw === '0' || raw === 'no' || raw === 'off') return false;
  return fallback;
}

function readNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asTimeIso(value: unknown): string {
  if (!value) return '';

  if (typeof value === 'number') {
    const millis = value > 1e14 ? value / 1_000_000 : value;
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString();
  }

  return '';
}

function flattenAttributes(raw: unknown): Record<string, string> {
  if (!isObject(raw)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (isObject(value) && 'stringValue' in value) {
      out[key] = readString((value as AnyRecord).stringValue);
      continue;
    }
    out[key] = readString(value);
  }
  return out;
}

function readServiceName(resourceOrAttributes: unknown): string {
  const attrs = isObject(resourceOrAttributes) ? resourceOrAttributes : {};
  return readString(
    attrs.serviceName
    || attrs.service_name
    || attrs['service.name']
    || (isObject(attrs.resource) ? (attrs.resource as AnyRecord).serviceName : undefined)
    || (isObject(attrs.resource) ? (attrs.resource as AnyRecord).service_name : undefined)
    || (isObject(attrs.resource) ? (attrs.resource as AnyRecord)['service.name'] : undefined),
    'unknown',
  );
}

function toSpanStatus(raw: unknown): SpanStatus {
  const status = readString((raw as AnyRecord)?.code || (raw as AnyRecord)?.status || (raw as AnyRecord)?.state, 'UNSET').toUpperCase();
  return status === 'OK' ? 'OK' : status === 'ERROR' ? 'ERROR' : 'UNSET';
}

function toTraceStatus(raw: unknown): 'OK' | 'ERROR' | 'TIMEOUT' | 'UNSET' {
  const status = readString((raw as AnyRecord)?.code || (raw as AnyRecord)?.status || (raw as AnyRecord)?.state, 'UNSET').toUpperCase();
  return status === 'OK' || status === 'ERROR' || status === 'TIMEOUT' ? status : 'UNSET';
}

function toSpan(raw: unknown, fallbackIndex: number): Span {
  const source = isObject(raw) ? raw : {};
  const spanId = readString(source.spanId || source.span_id || source.id, `span-${fallbackIndex}`);
  const startNs = readNumber(source.startTimeUnixNano || source.startTime || source.start_time, 0);
  const endNs = readNumber(source.endTimeUnixNano || source.endTime || source.end_time, startNs);

  return {
    spanId,
    name: readString(source.name, `Span ${fallbackIndex + 1}`),
    parentSpanId: readString(source.parentSpanId || source.parentSpan_id || source.parentSpanID) || null,
    serviceName: readServiceName(source.resource || source) || 'unknown',
    kind: readString(source.kind),
    status: toSpanStatus(source.status),
    startTime: asTimeIso(startNs || source.startTime || source.start_time),
    endTime: asTimeIso(endNs || source.endTime || source.end_time),
    durationMs: endNs && startNs ? (endNs - startNs) / 1_000_000 : readNumber(source.durationMs || source.duration_ms || source.duration, 0),
    attributes: flattenAttributes(source.attributes),
  };
}

function toTrace(raw: unknown): Trace {
  const source = isObject(raw) ? raw : {};
  const spans: Span[] = Array.isArray(source.spans)
    ? source.spans.map((span, i) => toSpan(span, i))
    : [];

  const rootSpan = spans.find((span) => !span.parentSpanId) ?? spans[0];
  const startTimeRaw = readNumber(source.startTimeUnixNano || source.startTime || source.start_time, rootSpan ? readNumber(rootSpan.startTime, 0) : 0);
  const endTimeRaw = readNumber(source.endTimeUnixNano || source.endTime || source.end_time, startTimeRaw);

  return {
    traceId: readString(source.traceId || source.trace_id || source.id, `trace-${Date.now()}`),
    rootSpanId: rootSpan?.spanId,
    operationName: readString(source.operationName || source.name || source.displayName, 'Untitled Trace'),
    serviceName: readServiceName(source.resource || source) || 'unknown',
    status: toTraceStatus(source.status),
    startTime: asTimeIso(startTimeRaw || source.startTime || source.start_time),
    endTime: asTimeIso(endTimeRaw || source.endTime || source.end_time),
    durationMs: source.durationMs ? readNumber(source.durationMs, 0) : (endTimeRaw && startTimeRaw ? (endTimeRaw - startTimeRaw) / 1_000_000 : 0),
    spans,
    attributes: flattenAttributes(source.attributes),
    errorMessage: readString(source.errorMessage || source.error_msg),
  };
}

function toLog(raw: unknown): LogRecord {
  const source = isObject(raw) ? raw : {};
  const normalizedLevel = readString(source.level || source.severityText || source.severity, 'INFO').toUpperCase();
  const allowed: LogLevel[] = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
  const level = allowed.includes(normalizedLevel as LogLevel) ? (normalizedLevel as LogLevel) : 'INFO';

  return {
    logId: readString(source.logId || source.log_id || source.id, `log-${Date.now()}`),
    traceId: readString(source.traceId || source.trace_id),
    spanId: readString(source.spanId || source.span_id),
    level,
    timestamp: asTimeIso(source.time || source.timestamp || source.observedTimeUnixNano),
    message: readString(source.body || source.message, '(empty)'),
    serviceName: readString(source.serviceName || source['service.name']),
    loggerName: readString(source.loggerName || source.logger_name),
    body: readString(source.body),
    attributes: flattenAttributes(source.attributes),
  };
}

function buildQueryString(values: Record<string, unknown>): string {
  const entries: Array<[string, string]> = Object.entries(values)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => [key, String(value)]);
  return new URLSearchParams(entries).toString();
}

function pickArray(payload: unknown, keys: string[]): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isObject(payload)) return [];

  for (const key of keys) {
    const value = payload[key];
    if (Array.isArray(value)) return value;
  }

  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
}

function pickNextCursor(payload: unknown): string | undefined {
  if (!isObject(payload)) return undefined;
  const cursorLike = payload.nextCursor || payload.next_cursor || payload.cursor || payload.pageToken || payload.page_token;
  const cursor = readString(cursorLike);
  return cursor || undefined;
}

async function readJson(path: string, init: RequestInit = {}): Promise<unknown> {
  const response = await platformApiFetch(path, {
    ...init,
    headers: {
      accept: 'application/json',
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  if (!text) return {};
  return JSON.parse(text);
}

function pageResult<T>(items: T[], nextCursor?: string): PagedResult<T> {
  return {
    items,
    nextCursor,
  };
}

export function createHttpObservabilityApiClient(): ObservabilityApiClient {
  const fetchTraces = async (filters?: {
    query?: string;
    serviceName?: string;
    status?: string;
    limit?: number;
    cursor?: string;
  }): Promise<PagedResult<Trace>> => {
    const query = buildQueryString({
      query: filters?.query,
      serviceName: filters?.serviceName,
      status: filters?.status,
      limit: filters?.limit ?? 25,
      cursor: filters?.cursor,
    });
    const path = `/api/v1/observability/traces${query ? `?${query}` : ''}`;
    return readJson(path)
      .then((payload) => {
        const list = pickArray(payload, ['traces', 'items', 'data', 'results']).map(toTrace);
        return pageResult(list, pickNextCursor(payload));
      })
      .catch(() => pageResult<Trace>([]));
  };

  const fetchTrace = async (traceId: string): Promise<Trace | null> => {
    try {
      const payload = await readJson(`/api/v1/observability/traces/${encodeURIComponent(traceId)}`);
      const list = pickArray(payload, ['trace', 'traces', 'items', 'data', 'results']).map(toTrace);
      if (list.length > 0) return list[0] || null;
      return isObject(payload) ? toTrace(payload) : null;
    } catch {
      return null;
    }
  };

  const fetchTelemetryStatus = async (): Promise<ObservabilityStatus> => {
    try {
      const payload = await readJson('/api/v1/observability/telemetry-status');
      const data = isObject(payload) ? payload : {};
      const traces = isObject(data.traces) ? data.traces : {};
      const logs = isObject(data.logs) ? data.logs : {};
      const metrics = isObject(data.metrics) ? data.metrics : {};

      return {
        traces: {
          available: readBooleanish(traces.available || traces.enabled || traces.ready, false),
          message: readString((traces as AnyRecord).message, 'No status payload for traces.'),
        },
        logs: {
          available: readBooleanish(logs.available || logs.enabled || logs.ready, false),
          message: readString((logs as AnyRecord).message, 'No status payload for logs.'),
        },
        metrics: {
          available: readBooleanish(metrics.available || metrics.enabled || metrics.ready, false),
          message: readString((metrics as AnyRecord).message, 'No status payload for metrics.'),
        },
        signoz_ui_url: readString((data as AnyRecord).signoz_ui_url, ''),
        jaeger_ui_url: readString((data as AnyRecord).jaeger_ui_url, ''),
      };
    } catch {
      return {
        traces: { available: false, message: 'Telemetry status endpoint unavailable.' },
        logs: { available: false, message: 'Telemetry status endpoint unavailable.' },
        metrics: { available: false, message: 'Telemetry status endpoint unavailable.' },
        signoz_ui_url: '',
        jaeger_ui_url: '',
      };
    }
  };

  const fetchLogs = async (query?: LogQuery): Promise<PagedResult<LogRecord>> => {
    const q = buildQueryString({
      query: query?.query,
      serviceName: query?.serviceName,
      minLevel: query?.minLevel,
      traceId: query?.traceId,
      limit: query?.limit ?? 50,
      cursor: query?.cursor,
    });
    const path = `/api/v1/observability/logs${q ? `?${q}` : ''}`;
    return readJson(path)
      .then((payload) => {
        const list = pickArray(payload, ['logs', 'items', 'data', 'results']).map(toLog);
        return pageResult(list, pickNextCursor(payload));
      })
      .catch(() => pageResult<LogRecord>([]));
  };

  const fetchTraceTimeline = async (traceId: string): Promise<TraceTimelinePoint[]> => {
    try {
      const payload = await readJson(`/api/v1/observability/traces/${encodeURIComponent(traceId)}/timeline`);
      if (!Array.isArray(payload)) return [];

      return payload
        .filter(isObject)
        .map((row) => ({
          traceId,
          spanId: readString((row as AnyRecord).spanId || (row as AnyRecord).span_id, ''),
          at: readNumber((row as AnyRecord).at || (row as AnyRecord).timestamp, 0),
          label: readString((row as AnyRecord).label || (row as AnyRecord).name, ''),
        }))
        .filter((point) => Boolean(point.spanId) && Boolean(point.label));
    } catch {
      return [];
    }
  };

  const subscribeToLogs: ObservabilityRealtimeTransport['subscribeToLogs'] = async (options): Promise<StopStream> => {
    const pollMs = Math.max(options.pollMs || DEFAULT_POLL_MS, 1000);
    let stopped = false;
    let cursor: string | undefined;
    const seen = new Set<string>();

    const poll = async () => {
      if (stopped || typeof options.onMessage !== 'function') return;
      const result = await fetchLogs({
        query: options.query,
        serviceName: options.serviceName,
        minLevel: options.minLevel,
        traceId: options.traceId,
        cursor,
        limit: 100,
      });
      cursor = result.nextCursor;
      for (const record of result.items) {
        if (seen.has(record.logId)) continue;
        seen.add(record.logId);
        options.onMessage(record);
      }
    };

    void poll();
    const timer = typeof window !== 'undefined' ? window.setInterval(() => { void poll(); }, pollMs) : undefined;

    return () => {
      stopped = true;
      if (timer !== undefined) {
        window.clearInterval(timer);
      }
    };
  };

  return {
    fetchTelemetryStatus,
    fetchTraces,
    fetchTrace,
    fetchTraceTimeline,
    fetchLogs,
    subscribeToLogs,
  };
}

