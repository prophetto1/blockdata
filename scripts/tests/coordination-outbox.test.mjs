import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

async function loadModules() {
  const [agentModule, outboxModule] = await Promise.all([
    import('../coordination/lib/agent.mjs').catch(() => ({})),
    import('../coordination/lib/outbox.mjs').catch(() => ({})),
  ]);

  return { ...outboxModule, ...agentModule };
}

async function makeTempRuntimeRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'coordination-outbox-'));
}

test('buffers task events locally when broker publish fails', async () => {
  const { publishTaskEvent, readBufferedEvents } = await loadModules();
  const runtimeRoot = await makeTempRuntimeRoot();

  await assert.rejects(
    () => publishTaskEvent({
      bus: {
        config: { runtimeRoot, outboxMaxBytes: 1024 * 1024 },
        async publishRaw() {
          throw new Error('broker down');
        },
      },
      runtimeRoot,
      taskId: 'e2e-001',
      eventKind: 'progress',
      payload: { percent: 25 },
      host: 'JON',
      agentId: 'codex',
      now: new Date('2026-04-09T12:00:00Z'),
    }),
    /Buffered coordination event/i,
  );

  const buffered = await readBufferedEvents({ runtimeRoot, host: 'JON', agentId: 'codex' });
  assert.equal(buffered.length, 1);
  assert.equal(buffered[0].subject, 'coord.tasks.e2e-001.event.progress');
  assert.equal(buffered[0].payload.percent, 25);
});

test('flushLocalOutbox replays buffered events once and compacts the outbox files', async () => {
  const { publishTaskEvent, flushLocalOutbox, readBufferedEvents, getOutboxBacklog } = await loadModules();
  const runtimeRoot = await makeTempRuntimeRoot();
  const published = [];

  await assert.rejects(
    () => publishTaskEvent({
      bus: {
        config: { runtimeRoot, outboxMaxBytes: 1024 * 1024 },
        async publishRaw() {
          throw new Error('broker down');
        },
      },
      runtimeRoot,
      taskId: 'e2e-001',
      eventKind: 'progress',
      payload: { percent: 50 },
      host: 'JON',
      agentId: 'codex',
      now: new Date('2026-04-09T12:05:00Z'),
    }),
    /Buffered coordination event/i,
  );

  const [buffered] = await readBufferedEvents({ runtimeRoot, host: 'JON', agentId: 'codex' });

  const result = await flushLocalOutbox({
    bus: {
      async publishRaw({ subject, payload, eventId }) {
        published.push({ subject, payload, eventId });
        return { duplicate: false };
      },
    },
    runtimeRoot,
    host: 'JON',
    agentId: 'codex',
  });

  const backlog = await getOutboxBacklog({ runtimeRoot, host: 'JON', agentId: 'codex' });
  assert.equal(result.flushed, 1);
  assert.equal(published.length, 1);
  assert.equal(published[0].eventId, buffered.eventId);
  assert.equal(published[0].payload.eventId, buffered.eventId);
  assert.equal(backlog.events, 0);
  assert.equal(backlog.files, 0);
});

test('hard-fails when the local outbox cap is exceeded', async () => {
  const { publishTaskEvent } = await loadModules();
  const runtimeRoot = await makeTempRuntimeRoot();

  await assert.rejects(
    () => publishTaskEvent({
      bus: {
        config: { runtimeRoot, outboxMaxBytes: 32 },
        async publishRaw() {
          throw new Error('broker down');
        },
      },
      runtimeRoot,
      outboxMaxBytes: 32,
      taskId: 'e2e-001',
      eventKind: 'progress',
      payload: { message: 'this payload is intentionally too large for the locked cap test' },
      host: 'JON',
      agentId: 'codex',
      now: new Date('2026-04-09T12:10:00Z'),
    }),
    /outbox cap exceeded/i,
  );
});
