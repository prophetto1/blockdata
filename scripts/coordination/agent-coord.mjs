#!/usr/bin/env node
import process from 'node:process';

import { buildCoordinationConfig, connectCoordinationBus } from './lib/client.mjs';
import {
  brokerProbe,
  close,
  claimTask,
  completeTask,
  createTask,
  flushLocalOutbox,
  getCoordinationStatus,
  heartbeatPresence,
  openCoordinationBuckets,
  publishTaskEvent,
  releaseTask,
  watchTaskEvents,
} from './lib/agent.mjs';

function parseArgs(argv) {
  const parsed = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) {
      parsed._.push(value);
      continue;
    }

    const key = value.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }

  return parsed;
}

function parseJson(value, fallback = {}) {
  if (!value) {
    return fallback;
  }

  return JSON.parse(value);
}

function requireOption(args, name) {
  const value = args[name];
  if (value == null || value === true || String(value).trim() === '') {
    throw new Error(`Missing required option --${name}`);
  }

  return String(value);
}

function identityFromArgs(args) {
  return {
    host: String(args.host ?? process.env.COMPUTERNAME ?? process.env.HOSTNAME ?? 'UNKNOWN_HOST'),
    agentId: String(args['agent-id'] ?? process.env.COORDINATION_AGENT_ID ?? process.env.USERNAME ?? process.env.USER ?? 'codex'),
  };
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function withBus(args, fn) {
  const bus = await connectCoordinationBus({
    clientName: 'coordination-cli',
    connectionOptions: {
      maxReconnectAttempts: 0,
      timeout: Number.parseInt(String(args['timeout-ms'] ?? '1500'), 10) || 1500,
    },
  });

  try {
    return await fn(bus);
  } finally {
    await close(bus);
  }
}

async function runStatus(args) {
  const config = buildCoordinationConfig();
  const identity = identityFromArgs(args);

  if (!config.enabled) {
    printJson({
      enabled: false,
      reachable: false,
      runtimeRoot: config.runtimeRoot,
      natsUrl: config.natsUrl,
      outbox: null,
      reason: 'coordination_runtime_disabled',
    });
    return;
  }

  try {
    const status = await withBus(args, async (bus) => getCoordinationStatus({
      bus,
      host: identity.host,
      agentId: identity.agentId,
    }));

    printJson({
      ...status,
      natsUrl: config.natsUrl,
    });
  } catch (error) {
    printJson({
      enabled: config.enabled,
      reachable: false,
      runtimeRoot: config.runtimeRoot,
      natsUrl: config.natsUrl,
      error: {
        message: String(error?.message ?? error),
        code: error?.code ?? null,
      },
    });
  }
}

async function runBrokerProbe(args) {
  const identity = identityFromArgs(args);

  const result = await withBus(args, async (bus) => brokerProbe({
    bus,
    host: identity.host,
    agentId: identity.agentId,
    payload: parseJson(args.json, {}),
  }));

  printJson(result);
}

async function runPresenceHeartbeat(args) {
  const identity = identityFromArgs(args);

  const result = await withBus(args, async (bus) => {
    const { presenceBucket } = await openCoordinationBuckets({ bus });
    return heartbeatPresence({
      bus,
      presenceBucket,
      host: identity.host,
      agentId: identity.agentId,
      status: String(args.status ?? 'online'),
      details: parseJson(args.json, {}),
    });
  });

  printJson(result);
}

async function runTaskCreate(args) {
  const identity = identityFromArgs(args);
  const taskId = requireOption(args, 'task-id');

  const result = await withBus(args, async (bus) => {
    const { stateBucket } = await openCoordinationBuckets({ bus });
    return createTask({
      stateBucket,
      taskId,
      host: identity.host,
      agentId: identity.agentId,
      task: parseJson(args.json, {}),
    });
  });

  printJson(result);
}

async function runTaskClaim(args) {
  const identity = identityFromArgs(args);
  const taskId = requireOption(args, 'task-id');

  const result = await withBus(args, async (bus) => {
    const { claimBucket, participantBucket } = await openCoordinationBuckets({ bus });
    return claimTask({
      claimBucket,
      participantBucket,
      taskId,
      host: identity.host,
      agentId: identity.agentId,
    });
  });

  printJson(result);
}

async function runTaskRelease(args) {
  const identity = identityFromArgs(args);
  const taskId = requireOption(args, 'task-id');

  const result = await withBus(args, async (bus) => {
    const { claimBucket } = await openCoordinationBuckets({ bus });
    return releaseTask({
      claimBucket,
      taskId,
      host: identity.host,
      agentId: identity.agentId,
    });
  });

  printJson(result);
}

async function runTaskComplete(args) {
  const identity = identityFromArgs(args);
  const taskId = requireOption(args, 'task-id');

  const result = await withBus(args, async (bus) => {
    const { claimBucket, stateBucket } = await openCoordinationBuckets({ bus });
    return completeTask({
      claimBucket,
      stateBucket,
      taskId,
      host: identity.host,
      agentId: identity.agentId,
      completion: parseJson(args.json, {}),
    });
  });

  printJson(result);
}

async function runTaskEvent(args) {
  const identity = identityFromArgs(args);
  const taskId = requireOption(args, 'task-id');
  const eventKind = requireOption(args, 'event-kind');

  const result = await withBus(args, async (bus) => publishTaskEvent({
    bus,
    taskId,
    eventKind,
    payload: parseJson(args.json, {}),
    host: identity.host,
    agentId: identity.agentId,
  }));

  printJson(result);
}

async function runTaskWatch(args) {
  const taskId = requireOption(args, 'task-id');
  const maxEvents = Number.parseInt(String(args.count ?? '1'), 10) || 1;
  const timeoutMs = Number.parseInt(String(args['timeout-ms'] ?? '10000'), 10) || 10000;

  await withBus(args, async (bus) => {
    const controller = new AbortController();
    const seen = [];
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const watcher = watchTaskEvents({
      bus,
      taskId,
      signal: controller.signal,
      onEvent(event) {
        seen.push(event);
        printJson(event);
        if (seen.length >= maxEvents) {
          controller.abort();
        }
      },
    });

    try {
      await watcher.closed;
    } catch (error) {
      if (!controller.signal.aborted) {
        throw error;
      }
    } finally {
      clearTimeout(timer);
    }

    printJson({
      status: 'watch_complete',
      taskId,
      seen: seen.length,
      timedOut: seen.length < maxEvents,
    });
  });
}

async function runOutboxFlush(args) {
  const identity = identityFromArgs(args);

  const result = await withBus(args, async (bus) => flushLocalOutbox({
    bus,
    host: identity.host,
    agentId: identity.agentId,
  }));

  printJson(result);
}

const commands = new Map([
  ['status', runStatus],
  ['broker-probe', runBrokerProbe],
  ['presence-heartbeat', runPresenceHeartbeat],
  ['task-create', runTaskCreate],
  ['task-claim', runTaskClaim],
  ['task-release', runTaskRelease],
  ['task-complete', runTaskComplete],
  ['task-event', runTaskEvent],
  ['task-watch', runTaskWatch],
  ['outbox-flush', runOutboxFlush],
]);

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [command = 'status'] = args._;
  const handler = commands.get(command);

  if (!handler) {
    throw new Error(`Unknown command "${command}"`);
  }

  await handler(args);
}

try {
  await main();
} catch (error) {
  process.stderr.write(`${String(error?.message ?? error)}\n`);
  process.exitCode = 1;
}
