import type { LogRecord } from '../types';
import type { ObservabilityRealtimeTransport, StopStream } from './types';

type SignalRConnectionOptions = {
  url?: string;
};

export function createSignalRTransport(_options: SignalRConnectionOptions = {}): ObservabilityRealtimeTransport {
  // SignalR transport is intentionally optional for now. We keep a safe no-op transport so importing
  // this module does not require the optional dependency unless the feature is explicitly switched on.
  return {
    async subscribeToLogs(): Promise<StopStream> {
      return () => {};
    },
  };
}

export function isSignalRTransportEnabled(url?: string): boolean {
  return Boolean(url);
}

export type { LogRecord as SignalRLogRecord };
