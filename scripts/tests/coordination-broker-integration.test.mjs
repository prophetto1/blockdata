import test from 'node:test';
import assert from 'node:assert/strict';

async function loadModules() {
  const [clientModule, agentModule] = await Promise.all([
    import('../coordination/lib/client.mjs').catch(() => ({})),
    import('../coordination/lib/agent.mjs').catch(() => ({})),
  ]);

  return { ...clientModule, ...agentModule };
}

function withTimeout(promise, timeoutMs, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

test('real broker integration enforces scoped delivery and stable-id dedupe', async (t) => {
  const {
    close,
    claimTask,
    connectCoordinationBus,
    getCoordinationInfrastructureStatus,
    openCoordinationBuckets,
    publishTaskEvent,
    watchTaskEvents,
  } = await loadModules();

  let bus;
  try {
    bus = await connectCoordinationBus({
      clientName: 'coordination-broker-integration-test',
      connectionOptions: {
        maxReconnectAttempts: 0,
        timeout: 1500,
      },
    });
  } catch (error) {
    t.skip(`coordination broker unavailable: ${String(error?.message ?? error)}`);
    return;
  }

  t.after(async () => {
    await close(bus);
  });

  const infrastructure = await getCoordinationInfrastructureStatus(bus);
  assert.deepEqual(infrastructure.missingStreams, [], 'expected locked coordination stream to exist before integration testing');
  assert.deepEqual(infrastructure.missingBuckets, [], 'expected locked coordination KV buckets to exist before integration testing');
  assert.deepEqual(infrastructure.contractMismatches, [], 'expected broker contract to match the locked stream configuration');

  const { claimBucket, participantBucket } = await openCoordinationBuckets({ bus });
  const taskId = `integration-${Date.now()}`;
  const otherTaskId = `${taskId}-other`;
  const eventId = `${taskId}-evt`;
  const seenForTask = [];
  const seenForOtherTask = [];

  const taskEventReceived = new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 3000);
    const controller = new AbortController();

    watchTaskEvents({
      bus,
      taskId,
      signal: controller.signal,
      onEvent(event) {
        seenForTask.push(event);
        clearTimeout(timer);
        controller.abort();
        resolve(event);
      },
    });
  });

  const otherController = new AbortController();
  const otherWatcher = watchTaskEvents({
    bus,
    taskId: otherTaskId,
    signal: otherController.signal,
    onEvent(event) {
      seenForOtherTask.push(event);
    },
  });
  t.after(() => {
    otherController.abort();
  });

  await claimTask({
    claimBucket,
    participantBucket,
    taskId,
    host: 'JON',
    agentId: 'codex',
  });

  const initialStreamInfo = await bus.jsm.streams.info('COORD_EVENTS');
  const firstPublish = await publishTaskEvent({
    bus,
    taskId,
    eventKind: 'progress',
    payload: { phase: 'integration' },
    host: 'JON',
    agentId: 'codex',
    eventId,
  });

  const deliveredEvent = await withTimeout(taskEventReceived, 3500, 'task event delivery');
  await new Promise((resolve) => setTimeout(resolve, 250));
  otherController.abort();
  try {
    await otherWatcher.closed;
  } catch {}

  assert.equal(firstPublish.duplicate, false);
  assert.ok(deliveredEvent, 'expected the target task watcher to receive the event');
  assert.equal(seenForTask.length, 1);
  assert.equal(seenForTask[0].eventId, eventId);
  assert.equal(seenForOtherTask.length, 0);

  const streamInfoAfterFirstPublish = await bus.jsm.streams.info('COORD_EVENTS');
  const secondPublish = await publishTaskEvent({
    bus,
    taskId,
    eventKind: 'progress',
    payload: { phase: 'integration' },
    host: 'JON',
    agentId: 'codex',
    eventId,
  });
  const streamInfoAfterRetry = await bus.jsm.streams.info('COORD_EVENTS');

  assert.equal(secondPublish.duplicate, true);
  assert.equal(streamInfoAfterFirstPublish.state.messages, initialStreamInfo.state.messages + 1);
  assert.equal(streamInfoAfterRetry.state.messages, streamInfoAfterFirstPublish.state.messages);
});
