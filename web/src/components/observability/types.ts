export type TraceStatus = 'OK' | 'ERROR' | 'UNSET' | 'TIMEOUT';

export type SpanStatus = 'OK' | 'ERROR' | 'UNSET';

export type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export type AvailabilityState = 'healthy' | 'degraded' | 'unknown';

export interface TenantContext {
  tenantId?: string;
  projectId?: string;
  environment?: string;
}

export interface TraceAttributeMap {
  [key: string]: string;
}

export interface Span {
  spanId: string;
  name: string;
  parentSpanId?: string | null;
  serviceName: string;
  kind?: string;
  status: SpanStatus;
  startTime: string;
  endTime?: string;
  durationMs: number;
  attributes: TraceAttributeMap;
}

export interface Trace {
  traceId: string;
  rootSpanId?: string;
  operationName: string;
  serviceName: string;
  status: TraceStatus;
  startTime: string;
  endTime?: string;
  durationMs: number;
  spans: Span[];
  attributes: TraceAttributeMap;
  errorMessage?: string;
}

export interface LogRecord {
  logId: string;
  traceId?: string;
  spanId?: string;
  level: LogLevel;
  timestamp: string;
  message: string;
  serviceName?: string;
  loggerName?: string;
  body?: string;
  attributes?: TraceAttributeMap;
}

export interface MetricPoint {
  name: string;
  value: number;
  unit?: string;
  timestamp: string;
}

export interface ServiceSummary {
  serviceName: string;
  availability: AvailabilityState;
  lastSeenAt?: string;
  activeTraces?: number;
}

export interface ObservabilityStatus {
  traces: {
    available: boolean;
    message?: string;
  };
  logs: {
    available: boolean;
    message?: string;
  };
  metrics: {
    available: boolean;
    message?: string;
  };
  signoz_ui_url?: string;
  jaeger_ui_url?: string;
}

export interface TraceTimelinePoint {
  traceId: string;
  spanId: string;
  at: number;
  label: string;
}
