import { useEffect, useRef, useState } from 'react';
import {
  CoordinationRuntimeDisabledError,
  type CoordinationStreamEnvelope,
  type CoordinationStreamEvent,
  openCoordinationEventStream,
} from '@/lib/coordinationApi';

const MAX_EVENTS = 250;
const RECONNECT_BASE_DELAY_MS = 500;
const RECONNECT_MAX_DELAY_MS = 5000;

export type CoordinationConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'degraded'
  | 'disabled'
  | 'error';

type UseCoordinationStreamOptions = {
  taskId?: string;
  subjectPrefix?: string;
  limit?: number;
};

type UseCoordinationStreamResult = {
  events: CoordinationStreamEvent[];
  paused: boolean;
  connectionState: CoordinationConnectionState;
  error: string | null;
  disabledReason: string | null;
  togglePaused: () => void;
  clear: () => void;
};

function isControlEnvelope(value: CoordinationStreamEnvelope): value is {
  type: 'control';
  state: string;
  message?: string | null;
  occurred_at: string;
} {
  return 'type' in value && value.type === 'control';
}

function parseSseFrame(frame: string): CoordinationStreamEnvelope | null {
  const dataLine = frame
    .split('\n')
    .map((line) => line.trimEnd())
    .find((line) => line.startsWith('data:'));

  if (!dataLine) return null;

  const raw = dataLine.slice(5).trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw) as CoordinationStreamEnvelope;
  } catch {
    return null;
  }
}

function waitForReconnect(delayMs: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      signal.removeEventListener('abort', handleAbort);
      resolve();
    }, delayMs);

    function handleAbort() {
      window.clearTimeout(timeoutId);
      signal.removeEventListener('abort', handleAbort);
      resolve();
    }

    signal.addEventListener('abort', handleAbort, { once: true });
  });
}

export function useCoordinationStream(options: UseCoordinationStreamOptions = {}): UseCoordinationStreamResult {
  const [events, setEvents] = useState<CoordinationStreamEvent[]>([]);
  const [paused, setPaused] = useState(false);
  const [connectionState, setConnectionState] = useState<CoordinationConnectionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [disabledReason, setDisabledReason] = useState<string | null>(null);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const controller = new AbortController();
    const decoder = new TextDecoder();
    let active = true;

    async function readStream() {
      let reconnectDelayMs = RECONNECT_BASE_DELAY_MS;

      while (active && !controller.signal.aborted) {
        setConnectionState('connecting');
        setError(null);
        setDisabledReason(null);

        try {
          const response = await openCoordinationEventStream(
            {
              taskId: options.taskId,
              subjectPrefix: options.subjectPrefix,
              limit: options.limit ?? MAX_EVENTS,
            },
            { signal: controller.signal },
          );

          if (!response.ok) {
            const payload = await response.json().catch(() => null);
            if (response.status === 503 && payload && typeof payload === 'object' && 'detail' in payload) {
              const detail = (payload as { detail?: { code?: string; message?: string } }).detail;
              if (detail?.code === 'coordination_runtime_disabled') {
                throw new CoordinationRuntimeDisabledError(detail.message);
              }
            }
            throw new Error(`Coordination stream request failed: ${response.status}`);
          }

          if (!response.body) {
            throw new Error('Coordination stream response body is unavailable.');
          }

          reconnectDelayMs = RECONNECT_BASE_DELAY_MS;
          const reader = response.body.getReader();
          let buffer = '';
          let streamClosed = false;

          try {
            while (active && !controller.signal.aborted) {
              const { done, value } = await reader.read();
              if (done) {
                streamClosed = true;
                break;
              }

              buffer += decoder.decode(value, { stream: true });
              let delimiterIndex = buffer.indexOf('\n\n');

              while (delimiterIndex !== -1) {
                const frame = buffer.slice(0, delimiterIndex);
                buffer = buffer.slice(delimiterIndex + 2);
                const envelope = parseSseFrame(frame);

                if (envelope) {
                  if (isControlEnvelope(envelope)) {
                    setConnectionState(envelope.state === 'degraded' ? 'degraded' : 'connected');
                    setError(envelope.state === 'degraded' ? envelope.message ?? 'Coordination bridge is degraded.' : null);
                  } else if (!pausedRef.current) {
                    setConnectionState('connected');
                    setEvents((current) => [...current, envelope].slice(-MAX_EVENTS));
                  }
                }

                delimiterIndex = buffer.indexOf('\n\n');
              }
            }
          } finally {
            await reader.cancel().catch(() => undefined);
          }

          if (!streamClosed || !active || controller.signal.aborted) {
            return;
          }

          setConnectionState('connecting');
        } catch (nextError) {
          if (!active || controller.signal.aborted) {
            return;
          }

          if (nextError instanceof CoordinationRuntimeDisabledError) {
            setConnectionState('disabled');
            setDisabledReason(nextError.message);
            setError(null);
            return;
          }

          setConnectionState('error');
          setError(nextError instanceof Error ? nextError.message : String(nextError));
        }

        await waitForReconnect(reconnectDelayMs, controller.signal);
        reconnectDelayMs = Math.min(reconnectDelayMs * 2, RECONNECT_MAX_DELAY_MS);
      }
    }

    void readStream();

    return () => {
      active = false;
      controller.abort();
    };
  }, [options.limit, options.subjectPrefix, options.taskId]);

  return {
    events,
    paused,
    connectionState,
    error,
    disabledReason,
    togglePaused: () => setPaused((current) => !current),
    clear: () => setEvents([]),
  };
}
