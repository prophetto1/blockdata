import path from 'node:path';
import { JSONCodec, connect } from 'nats';

import {
  DEFAULT_COORDINATION_NATS_URL,
  DEFAULT_OUTBOX_MAX_BYTES,
  DEFAULT_RUNTIME_ROOT,
  CoordinationUnavailableError,
  KV_BUCKETS,
  STREAMS,
} from './contracts.mjs';
import {
  assertAllowedSubject,
  assertAllowedWatchSubject,
} from './subjects.mjs';

const codec = JSONCodec();
const HOURS_PER_NANOSECOND = 1 / (1_000_000_000 * 60 * 60);

export const EXPECTED_COORD_EVENTS_STREAM = Object.freeze({
  name: STREAMS.COORD_EVENTS,
  subjects: ['coord.tasks.>', 'coord.sessions.>', 'coord.system.>'],
  storage: 'file',
  replicas: 1,
  maxAgeHours: 168,
  duplicateWindowHours: 24,
  discard: 'old',
});

function parseEnabledFlag(value) {
  return String(value ?? 'true').toLowerCase() !== 'false';
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function createDisabledBus(config) {
  const disabledError = () => new CoordinationUnavailableError('Coordination runtime is disabled', {
    code: 'coordination_runtime_disabled',
    details: { enabled: false },
  });

  return {
    enabled: false,
    codec,
    config,
    nc: null,
    js: null,
    jsm: null,
    async kv() {
      throw disabledError();
    },
    async publishRaw() {
      throw disabledError();
    },
    subscribe() {
      throw disabledError();
    },
    async close() {},
  };
}

export function buildCoordinationConfig({ env = process.env, cwd = process.cwd(), clientName } = {}) {
  return {
    enabled: parseEnabledFlag(env.COORDINATION_RUNTIME_ENABLED),
    clientName: clientName ?? env.COORDINATION_CLIENT_NAME ?? 'coordination-runtime',
    natsUrl: env.COORDINATION_NATS_URL || DEFAULT_COORDINATION_NATS_URL,
    runtimeRoot: path.resolve(cwd, env.COORDINATION_RUNTIME_ROOT || DEFAULT_RUNTIME_ROOT),
    outboxMaxBytes: parsePositiveInteger(env.COORDINATION_OUTBOX_MAX_BYTES, DEFAULT_OUTBOX_MAX_BYTES),
    streams: STREAMS,
    buckets: KV_BUCKETS,
  };
}

export async function connectCoordinationBus({
  env = process.env,
  cwd = process.cwd(),
  clientName,
  connectionFactory = connect,
  connectionOptions = {},
} = {}) {
  const config = buildCoordinationConfig({ env, cwd, clientName });
  if (!config.enabled) {
    return createDisabledBus(config);
  }

  const nc = await connectionFactory({
    servers: config.natsUrl,
    name: config.clientName,
    ...connectionOptions,
  });
  const js = nc.jetstream();
  const jsm = await nc.jetstreamManager();

  return {
    enabled: true,
    codec,
    config,
    nc,
    js,
    jsm,
    async kv(bucketName, opts) {
      return js.views.kv(bucketName, opts);
    },
    async publishRaw({ subject, payload, eventId, headers }) {
      assertAllowedSubject(subject);
      const data = payload instanceof Uint8Array ? payload : codec.encode(payload);
      return js.publish(subject, data, { msgID: eventId, headers });
    },
    subscribe(subject, { onMessage, signal } = {}) {
      assertAllowedWatchSubject(subject);
      const subscription = nc.subscribe(subject);

      const closed = (async () => {
        for await (const message of subscription) {
          const decoded = codec.decode(message.data);
          await onMessage?.(decoded, message);
        }
      })();

      if (signal) {
        signal.addEventListener('abort', () => {
          subscription.unsubscribe();
        }, { once: true });
      }

      return {
        closed,
        subscription,
        unsubscribe() {
          subscription.unsubscribe();
        },
      };
    },
    async close() {
      await nc.drain();
      await nc.closed();
    },
  };
}

export async function close(bus) {
  await bus?.close?.();
}

function asHours(nanoseconds) {
  if (!Number.isFinite(Number(nanoseconds))) {
    return null;
  }

  return Number(nanoseconds) * HOURS_PER_NANOSECOND;
}

function almostEqual(left, right, tolerance = 0.001) {
  return Math.abs(left - right) <= tolerance;
}

function normalizeError(error) {
  return {
    message: String(error?.message ?? error),
    code: error?.code ?? null,
  };
}

function mapStreamInfo(info) {
  if (!info) {
    return null;
  }

  return {
    storage: String(info.config?.storage ?? '').toLowerCase(),
    subjects: [...(info.config?.subjects ?? [])].sort(),
    replicas: info.config?.num_replicas ?? null,
    discard: String(info.config?.discard ?? '').toLowerCase(),
    maxAgeHours: asHours(info.config?.max_age),
    duplicateWindowHours: asHours(info.config?.duplicate_window),
    messages: info.state?.messages ?? null,
  };
}

async function inspectStream(bus, streamName) {
  try {
    const info = await bus.jsm.streams.info(streamName);
    return {
      name: streamName,
      present: true,
      ...mapStreamInfo(info),
    };
  } catch (error) {
    return {
      name: streamName,
      present: false,
      error: normalizeError(error),
    };
  }
}

export function kvBackingStreamName(bucketName) {
  return `KV_${bucketName}`;
}

export async function getCoordinationInfrastructureStatus(bus) {
  if (!bus?.enabled) {
    return {
      enabled: false,
      reachable: false,
      server: null,
      rttMs: null,
      stream: { name: STREAMS.COORD_EVENTS, present: false },
      buckets: Object.fromEntries(
        Object.values(KV_BUCKETS).map((bucketName) => [bucketName, { name: bucketName, present: false }]),
      ),
      missingStreams: [STREAMS.COORD_EVENTS],
      missingBuckets: Object.values(KV_BUCKETS),
      contractMismatches: ['coordination runtime disabled'],
    };
  }

  const [rttMs, stream, bucketEntries] = await Promise.all([
    bus.nc.rtt(),
    inspectStream(bus, STREAMS.COORD_EVENTS),
    Promise.all(
      Object.values(KV_BUCKETS).map(async (bucketName) => [
        bucketName,
        await inspectStream(bus, kvBackingStreamName(bucketName)),
      ]),
    ),
  ]);

  const buckets = Object.fromEntries(bucketEntries);
  const missingStreams = stream.present ? [] : [STREAMS.COORD_EVENTS];
  const missingBuckets = Object.entries(buckets)
    .filter(([, status]) => !status.present)
    .map(([bucketName]) => bucketName);

  const contractMismatches = [];
  if (stream.present) {
    const actualSubjects = stream.subjects ?? [];
    const expectedSubjects = [...EXPECTED_COORD_EVENTS_STREAM.subjects].sort();

    if (JSON.stringify(actualSubjects) !== JSON.stringify(expectedSubjects)) {
      contractMismatches.push(`stream ${stream.name} subjects do not match the locked contract`);
    }
    if (stream.storage !== EXPECTED_COORD_EVENTS_STREAM.storage) {
      contractMismatches.push(`stream ${stream.name} storage is ${stream.storage}, expected ${EXPECTED_COORD_EVENTS_STREAM.storage}`);
    }
    if (stream.replicas !== EXPECTED_COORD_EVENTS_STREAM.replicas) {
      contractMismatches.push(`stream ${stream.name} replicas are ${stream.replicas}, expected ${EXPECTED_COORD_EVENTS_STREAM.replicas}`);
    }
    if (stream.discard !== EXPECTED_COORD_EVENTS_STREAM.discard) {
      contractMismatches.push(`stream ${stream.name} discard policy is ${stream.discard}, expected ${EXPECTED_COORD_EVENTS_STREAM.discard}`);
    }
    if (!almostEqual(stream.maxAgeHours ?? NaN, EXPECTED_COORD_EVENTS_STREAM.maxAgeHours)) {
      contractMismatches.push(`stream ${stream.name} max_age is ${stream.maxAgeHours}h, expected ${EXPECTED_COORD_EVENTS_STREAM.maxAgeHours}h`);
    }
    if (!almostEqual(stream.duplicateWindowHours ?? NaN, EXPECTED_COORD_EVENTS_STREAM.duplicateWindowHours)) {
      contractMismatches.push(`stream ${stream.name} duplicate window is ${stream.duplicateWindowHours}h, expected ${EXPECTED_COORD_EVENTS_STREAM.duplicateWindowHours}h`);
    }
  }

  return {
    enabled: true,
    reachable: true,
    server: bus.nc.getServer(),
    rttMs,
    stream,
    buckets,
    missingStreams,
    missingBuckets,
    contractMismatches,
  };
}
