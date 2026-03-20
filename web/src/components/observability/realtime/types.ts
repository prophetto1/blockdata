import type { LogLevel, LogRecord, ObservabilityStatus, Trace, TraceTimelinePoint } from '../types';

export type PagedResult<T> = {
  items: T[];
  nextCursor?: string;
};

export type StopStream = () => void;

export interface TraceQuery {
  query?: string;
  serviceName?: string;
  status?: string;
  limit?: number;
  cursor?: string;
}

export type LogQuery = {
  query?: string;
  serviceName?: string;
  minLevel?: LogLevel;
  traceId?: string;
  limit?: number;
  cursor?: string;
};

export interface LogStreamOptions {
  query?: string;
  serviceName?: string;
  minLevel?: LogLevel;
  traceId?: string;
  pollMs?: number;
  onMessage: (record: LogRecord) => void;
}

export interface TraceListResponse {
  items: Trace[];
  nextCursor?: string;
}

export interface ObservabilityRealtimeTransport {
  subscribeToLogs(options: LogStreamOptions): Promise<StopStream>;
}

export interface ObservabilityApiClient {
  fetchTelemetryStatus(): Promise<ObservabilityStatus>;
  fetchTraces(filters?: TraceQuery): Promise<PagedResult<Trace>>;
  fetchTrace(traceId: string): Promise<Trace | null>;
  fetchTraceTimeline(traceId: string): Promise<TraceTimelinePoint[]>;
  fetchLogs(query?: LogQuery): Promise<PagedResult<LogRecord>>;
  subscribeToLogs(options: LogStreamOptions): Promise<StopStream>;
}
