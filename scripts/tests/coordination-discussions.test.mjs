import test from 'node:test';
import assert from 'node:assert/strict';

const DISCUSSIONS_MODULE_PATH = new URL('../../tools/coordination/lib/discussions.mjs', import.meta.url);
const AGENT_MODULE_PATH = new URL('../../tools/coordination/lib/agent.mjs', import.meta.url);
const CONTRACTS_MODULE_PATH = new URL('../../tools/coordination/lib/contracts.mjs', import.meta.url);

class InMemoryKvBucket {
  constructor() {
    this.entries = new Map();
    this.revision = 0;
  }

  async get(key) {
    const entry = this.entries.get(key);
    if (!entry) {
      return null;
    }

    return {
      revision: entry.revision,
      value: entry.value,
    };
  }

  async create(key, value) {
    if (this.entries.has(key)) {
      const error = new Error(`revision conflict for ${key}`);
      error.code = 'REVISION_CONFLICT';
      throw error;
    }

    const revision = this.#nextRevision();
    this.entries.set(key, { revision, value });
    return revision;
  }

  async update(key, value, revision) {
    const current = this.entries.get(key);
    if (!current || current.revision !== revision) {
      const error = new Error(`wrong last sequence for ${key}`);
      error.code = 'REVISION_CONFLICT';
      throw error;
    }

    const nextRevision = this.#nextRevision();
    this.entries.set(key, { revision: nextRevision, value });
    return nextRevision;
  }

  async keys() {
    const entries = [...this.entries.keys()];
    return (async function* iterator() {
      for (const key of entries) {
        yield key;
      }
    }());
  }

  #nextRevision() {
    this.revision += 1;
    return this.revision;
  }
}

async function loadModules() {
  const cacheBust = `?t=${Date.now()}-${Math.random()}`;
  const [discussionsModule, agentModule, contractsModule] = await Promise.all([
    import(`${DISCUSSIONS_MODULE_PATH.href}${cacheBust}`),
    import(`${AGENT_MODULE_PATH.href}${cacheBust}`),
    import(`${CONTRACTS_MODULE_PATH.href}${cacheBust}`),
  ]);

  return {
    ...discussionsModule,
    ...agentModule,
    ...contractsModule,
  };
}

test('openCoordinationBuckets includes the discussion-state bucket in the runtime contract', async () => {
  const { KV_BUCKETS, openCoordinationBuckets } = await loadModules();
  const requestedBuckets = [];
  const fakeBus = {
    async kv(bucketName) {
      requestedBuckets.push(bucketName);
      return { bucketName };
    },
  };

  const result = await openCoordinationBuckets({ bus: fakeBus });

  assert.equal(result.discussionBucket.bucketName, KV_BUCKETS.DISCUSSION_STATE);
  assert.ok(requestedBuckets.includes(KV_BUCKETS.DISCUSSION_STATE));
});

test('bindTaskWorkspace stores workspace metadata and workspace lookup resolves the bound task by full scan', async () => {
  const { bindTaskWorkspace, createTask, getDiscussionState, getTaskState, resolveTaskIdForWorkspacePath } = await loadModules();
  const stateBucket = new InMemoryKvBucket();
  const discussionBucket = new InMemoryKvBucket();
  const now = new Date('2026-04-11T12:00:00.000Z');
  const workspacePath = 'E:\\writing-system\\_collaborate\\research\\20260410--02--agent-identity-and-discussion-routing--JON';
  const directionalDoc = `${workspacePath}\\0411--agent-coordination-and-hook-bus-prd--JON-cdx.md`;

  await createTask({
    stateBucket,
    taskId: 'task-1',
    host: 'JON',
    agentId: 'cdx',
    now,
  });

  await bindTaskWorkspace({
    stateBucket,
    discussionBucket,
    taskId: 'task-1',
    workspacePath,
    workspaceType: 'research',
    directionalDoc,
    now,
  });

  await createTask({
    stateBucket,
    taskId: 'task-2',
    host: 'JON',
    agentId: 'cdx2',
    now,
  });

  await bindTaskWorkspace({
    stateBucket,
    discussionBucket,
    taskId: 'task-2',
    workspacePath: 'E:\\writing-system\\_collaborate\\research\\20260411--05--workflow-skill-prompt-canvas--JON',
    workspaceType: 'research',
    directionalDoc: 'E:\\writing-system\\_collaborate\\research\\20260411--05--workflow-skill-prompt-canvas--JON\\background\\background-context.md',
    now,
  });

  const taskState = await getTaskState({ stateBucket, taskId: 'task-1' });
  assert.deepEqual(taskState.metadata, {
    workspace_type: 'research',
    workspace_path: workspacePath,
    directional_doc: directionalDoc,
  });

  const state = await getDiscussionState({
    stateBucket,
    discussionBucket,
    taskId: 'task-1',
  });
  assert.equal(state.workspacePath, workspacePath);
  assert.equal(state.directionalDoc, directionalDoc);
  assert.equal(state.workspaceType, 'research');

  const resolved = await resolveTaskIdForWorkspacePath({
    discussionBucket,
    workspacePath,
  });
  assert.equal(resolved.taskId, 'task-1');
  assert.equal(resolved.workspacePath, workspacePath);
});

test('projectDiscussionEvent records message_posted activity without creating a pending obligation', async () => {
  const { bindTaskWorkspace, createTask, getDiscussionState, projectDiscussionEvent } = await loadModules();
  const stateBucket = new InMemoryKvBucket();
  const discussionBucket = new InMemoryKvBucket();
  const now = new Date('2026-04-11T12:00:00.000Z');

  await createTask({
    stateBucket,
    taskId: 'task-1',
    host: 'JON',
    agentId: 'cdx',
    now,
  });

  await bindTaskWorkspace({
    stateBucket,
    discussionBucket,
    taskId: 'task-1',
    workspacePath: 'E:\\writing-system\\_collaborate\\research\\20260410--02--agent-identity-and-discussion-routing--JON',
    workspaceType: 'research',
    directionalDoc: 'E:\\writing-system\\_collaborate\\research\\20260410--02--agent-identity-and-discussion-routing--JON\\0411--agent-coordination-and-hook-bus-prd--JON-cdx.md',
    now,
  });

  await projectDiscussionEvent({
    stateBucket,
    discussionBucket,
    taskId: 'task-1',
    eventKind: 'message_posted',
    payload: {
      author: { host: 'JON', agentId: 'cdx' },
    },
    now,
  });

  const state = await getDiscussionState({ stateBucket, discussionBucket, taskId: 'task-1' });
  assert.equal(state.lastEventKind, 'message_posted');
  assert.equal(state.status, 'acknowledged');
  assert.deepEqual(state.pendingRecipients, []);
  assert.deepEqual(state.participants, [{ host: 'JON', agentId: 'cdx' }]);
});

test('projectDiscussionEvent marks recipients pending and clears them on response acknowledgement', async () => {
  const { bindTaskWorkspace, createTask, getDiscussionState, projectDiscussionEvent } = await loadModules();
  const stateBucket = new InMemoryKvBucket();
  const discussionBucket = new InMemoryKvBucket();
  const now = new Date('2026-04-11T12:00:00.000Z');

  await createTask({
    stateBucket,
    taskId: 'task-1',
    host: 'JON',
    agentId: 'cdx',
    now,
  });

  await bindTaskWorkspace({
    stateBucket,
    discussionBucket,
    taskId: 'task-1',
    workspacePath: 'E:\\writing-system\\_collaborate\\research\\20260410--02--agent-identity-and-discussion-routing--JON',
    workspaceType: 'research',
    directionalDoc: 'E:\\writing-system\\_collaborate\\research\\20260410--02--agent-identity-and-discussion-routing--JON\\0411--agent-coordination-and-hook-bus-prd--JON-cdx.md',
    now,
  });

  await projectDiscussionEvent({
    stateBucket,
    discussionBucket,
    taskId: 'task-1',
    eventKind: 'response_requested',
    payload: {
      recipients: [
        { host: 'JON', agentId: 'cdx' },
        { host: 'JON', agentId: 'cdx2' },
      ],
    },
    now,
  });

  let state = await getDiscussionState({ stateBucket, discussionBucket, taskId: 'task-1' });
  assert.equal(state.status, 'pending');
  assert.deepEqual(state.pendingRecipients, [
    { host: 'JON', agentId: 'cdx' },
    { host: 'JON', agentId: 'cdx2' },
  ]);

  await projectDiscussionEvent({
    stateBucket,
    discussionBucket,
    taskId: 'task-1',
    eventKind: 'response_acknowledged',
    payload: {
      recipient: { host: 'JON', agentId: 'cdx' },
    },
    now: new Date('2026-04-11T12:01:00.000Z'),
  });

  state = await getDiscussionState({ stateBucket, discussionBucket, taskId: 'task-1' });
  assert.equal(state.status, 'pending');
  assert.deepEqual(state.pendingRecipients, [{ host: 'JON', agentId: 'cdx2' }]);

  await projectDiscussionEvent({
    stateBucket,
    discussionBucket,
    taskId: 'task-1',
    eventKind: 'response_acknowledged',
    payload: {
      recipient: { host: 'JON', agentId: 'cdx2' },
    },
    now: new Date('2026-04-11T12:02:00.000Z'),
  });

  state = await getDiscussionState({ stateBucket, discussionBucket, taskId: 'task-1' });
  assert.equal(state.status, 'acknowledged');
  assert.deepEqual(state.pendingRecipients, []);
  assert.equal(state.lastEventKind, 'response_acknowledged');
});

test('projectDiscussionEvent marks pending work as stale when a stale warning is projected', async () => {
  const { bindTaskWorkspace, createTask, getDiscussionState, projectDiscussionEvent } = await loadModules();
  const stateBucket = new InMemoryKvBucket();
  const discussionBucket = new InMemoryKvBucket();
  const now = new Date('2026-04-11T12:00:00.000Z');

  await createTask({
    stateBucket,
    taskId: 'task-1',
    host: 'JON',
    agentId: 'cdx',
    now,
  });

  await bindTaskWorkspace({
    stateBucket,
    discussionBucket,
    taskId: 'task-1',
    workspacePath: 'E:\\writing-system\\_collaborate\\research\\20260410--02--agent-identity-and-discussion-routing--JON',
    workspaceType: 'research',
    directionalDoc: 'E:\\writing-system\\_collaborate\\research\\20260410--02--agent-identity-and-discussion-routing--JON\\0411--agent-coordination-and-hook-bus-prd--JON-cdx.md',
    now,
  });

  await projectDiscussionEvent({
    stateBucket,
    discussionBucket,
    taskId: 'task-1',
    eventKind: 'response_requested',
    payload: {
      recipients: [{ host: 'JON', agentId: 'cdx' }],
    },
    now,
  });

  await projectDiscussionEvent({
    stateBucket,
    discussionBucket,
    taskId: 'task-1',
    eventKind: 'stale_warning',
    payload: {
      recipients: [{ host: 'JON', agentId: 'cdx' }],
    },
    now: new Date('2026-04-11T12:10:00.000Z'),
  });

  const state = await getDiscussionState({ stateBucket, discussionBucket, taskId: 'task-1' });
  assert.equal(state.status, 'stale');
  assert.equal(state.lastEventKind, 'stale_warning');
  assert.deepEqual(state.pendingRecipients, [{ host: 'JON', agentId: 'cdx' }]);
});

test('listDiscussionStates returns summary data and filters by workspace path and status', async () => {
  const {
    bindTaskWorkspace,
    createTask,
    listDiscussionStates,
    projectDiscussionEvent,
  } = await loadModules();
  const stateBucket = new InMemoryKvBucket();
  const discussionBucket = new InMemoryKvBucket();
  const now = new Date('2026-04-11T12:00:00.000Z');
  const workspacePath = 'E:\\writing-system\\_collaborate\\research\\20260410--02--agent-identity-and-discussion-routing--JON';

  await createTask({ stateBucket, taskId: 'task-1', host: 'JON', agentId: 'cdx', now });
  await createTask({ stateBucket, taskId: 'task-2', host: 'JON', agentId: 'cdx2', now });

  await bindTaskWorkspace({
    stateBucket,
    discussionBucket,
    taskId: 'task-1',
    workspacePath,
    workspaceType: 'research',
    directionalDoc: `${workspacePath}\\0411--agent-coordination-and-hook-bus-prd--JON-cdx.md`,
    now,
  });
  await bindTaskWorkspace({
    stateBucket,
    discussionBucket,
    taskId: 'task-2',
    workspacePath: 'E:\\writing-system\\_collaborate\\research\\20260411--05--workflow-skill-prompt-canvas--JON',
    workspaceType: 'research',
    directionalDoc: 'E:\\writing-system\\_collaborate\\research\\20260411--05--workflow-skill-prompt-canvas--JON\\background\\background-context.md',
    now,
  });

  await projectDiscussionEvent({
    stateBucket,
    discussionBucket,
    taskId: 'task-1',
    eventKind: 'response_requested',
    payload: { recipients: [{ host: 'JON', agentId: 'cdx' }] },
    now,
  });
  await projectDiscussionEvent({
    stateBucket,
    discussionBucket,
    taskId: 'task-2',
    eventKind: 'message_posted',
    payload: { author: { host: 'JON', agentId: 'cdx2' } },
    now,
  });

  const pending = await listDiscussionStates({
    stateBucket,
    discussionBucket,
    workspacePath,
    status: 'pending',
  });

  assert.equal(pending.summary.threadCount, 1);
  assert.equal(pending.summary.pendingCount, 1);
  assert.equal(pending.summary.staleCount, 0);
  assert.equal(pending.summary.workspaceBoundCount, 1);
  assert.equal(pending.discussions[0].taskId, 'task-1');
  assert.equal(pending.discussions[0].workspacePath, workspacePath);
});

test('markStaleDiscussions projects stale warnings for overdue pending obligations', async () => {
  const {
    bindTaskWorkspace,
    createTask,
    getDiscussionState,
    markStaleDiscussions,
    projectDiscussionEvent,
  } = await loadModules();
  const stateBucket = new InMemoryKvBucket();
  const discussionBucket = new InMemoryKvBucket();
  const workspacePath = 'E:\\writing-system\\_collaborate\\research\\20260410--02--agent-identity-and-discussion-routing--JON';

  await createTask({
    stateBucket,
    taskId: 'task-1',
    host: 'JON',
    agentId: 'cdx',
    now: new Date('2026-04-11T12:00:00.000Z'),
  });

  await bindTaskWorkspace({
    stateBucket,
    discussionBucket,
    taskId: 'task-1',
    workspacePath,
    workspaceType: 'research',
    directionalDoc: `${workspacePath}\\0411--agent-coordination-and-hook-bus-prd--JON-cdx.md`,
    now: new Date('2026-04-11T12:00:00.000Z'),
  });

  await projectDiscussionEvent({
    stateBucket,
    discussionBucket,
    taskId: 'task-1',
    eventKind: 'response_requested',
    payload: { recipients: [{ host: 'JON', agentId: 'cdx' }] },
    now: new Date('2026-04-11T12:00:00.000Z'),
  });

  const emitted = [];
  const result = await markStaleDiscussions({
    stateBucket,
    discussionBucket,
    now: new Date('2026-04-11T12:10:00.000Z'),
    staleAfterSeconds: 60,
    publishEvent: async (event) => {
      emitted.push(event);
    },
  });

  assert.equal(result.summary.staleMarkedCount, 1);
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].taskId, 'task-1');
  assert.equal(emitted[0].eventKind, 'stale_warning');

  const state = await getDiscussionState({ stateBucket, discussionBucket, taskId: 'task-1' });
  assert.equal(state.status, 'stale');
});
