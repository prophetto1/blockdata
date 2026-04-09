import test from 'node:test';
import assert from 'node:assert/strict';

class FakeKvBucket {
  #entries = new Map();
  #sequence = 0;

  async get(key) {
    return this.#entries.get(key) ?? null;
  }

  async create(key, value) {
    if (this.#entries.has(key)) {
      const error = new Error(`wrong last sequence for ${key}`);
      error.code = 'REVISION_CONFLICT';
      throw error;
    }

    this.#sequence += 1;
    this.#entries.set(key, { revision: this.#sequence, value });
    return this.#sequence;
  }

  async update(key, value, revision) {
    const current = this.#entries.get(key);
    if (!current || current.revision !== revision) {
      const error = new Error(`wrong last sequence for ${key}`);
      error.code = 'REVISION_CONFLICT';
      throw error;
    }

    this.#sequence += 1;
    this.#entries.set(key, { revision: this.#sequence, value });
    return this.#sequence;
  }
}

async function loadModules() {
  const [agentModule, kvModule] = await Promise.all([
    import('../coordination/lib/agent.mjs').catch(() => ({})),
    import('../coordination/lib/kv.mjs').catch(() => ({})),
  ]);

  return { ...agentModule, ...kvModule };
}

test('claimTask creates and refreshes the same claimant using compare-and-set', async () => {
  const { claimTask } = await loadModules();
  const claimBucket = new FakeKvBucket();

  const firstClaim = await claimTask({
    claimBucket,
    taskId: 'e2e-001',
    host: 'JON',
    agentId: 'codex',
    now: new Date('2026-04-09T12:00:00Z'),
  });

  const refreshedClaim = await claimTask({
    claimBucket,
    taskId: 'e2e-001',
    host: 'JON',
    agentId: 'codex',
    now: new Date('2026-04-09T12:00:30Z'),
  });

  assert.equal(firstClaim.status, 'claimed');
  assert.equal(refreshedClaim.status, 'claimed');
  assert.ok(refreshedClaim.revision > firstClaim.revision);
});

test('releaseTask clears the claim and a new claimant can take it', async () => {
  const { claimTask, releaseTask } = await loadModules();
  const claimBucket = new FakeKvBucket();

  await claimTask({
    claimBucket,
    taskId: 'e2e-001',
    host: 'JON',
    agentId: 'codex',
    now: new Date('2026-04-09T12:00:00Z'),
  });

  const released = await releaseTask({
    claimBucket,
    taskId: 'e2e-001',
    host: 'JON',
    agentId: 'codex',
    now: new Date('2026-04-09T12:01:00Z'),
  });

  const secondClaim = await claimTask({
    claimBucket,
    taskId: 'e2e-001',
    host: 'BUDDY',
    agentId: 'claude',
    now: new Date('2026-04-09T12:02:00Z'),
  });

  assert.equal(released.status, 'released');
  assert.equal(secondClaim.claimedBy.host, 'BUDDY');
  assert.equal(secondClaim.claimedBy.agentId, 'claude');
});

test('completeTask requires an active claim and writes completed task state', async () => {
  const { claimTask, completeTask, getTaskState } = await loadModules();
  const claimBucket = new FakeKvBucket();
  const stateBucket = new FakeKvBucket();

  await claimTask({
    claimBucket,
    taskId: 'e2e-001',
    host: 'JON',
    agentId: 'codex',
    now: new Date('2026-04-09T12:00:00Z'),
  });

  const completed = await completeTask({
    claimBucket,
    stateBucket,
    taskId: 'e2e-001',
    host: 'JON',
    agentId: 'codex',
    completion: { result: 'done' },
    now: new Date('2026-04-09T12:03:00Z'),
  });

  const taskState = await getTaskState({ stateBucket, taskId: 'e2e-001' });

  assert.equal(completed.status, 'completed');
  assert.equal(taskState.status, 'completed');
  assert.equal(taskState.result, 'done');
});

test('surfaces revision conflicts as TaskRevisionConflictError', async () => {
  const { createRecord, updateRecord, taskStateKey } = await loadModules();
  const stateBucket = new FakeKvBucket();
  const key = taskStateKey('e2e-001');

  await createRecord(stateBucket, key, { taskId: 'e2e-001', status: 'claimed' });

  await assert.rejects(
    () => updateRecord(stateBucket, key, { taskId: 'e2e-001', status: 'completed' }, 999),
    /Revision conflict/i,
  );
});
