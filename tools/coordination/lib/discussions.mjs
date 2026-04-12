import { assertSubjectToken } from './contracts.mjs';
import {
  createRecord,
  getRecord,
  taskStateKey,
  updateRecord,
} from './kv.mjs';

function asIsoString(value = new Date()) {
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

function discussionStateKey(taskId) {
  return taskStateKey(taskId);
}

function mergeTaskMetadata(currentValue = {}, metadataPatch = {}) {
  return {
    ...(currentValue ?? {}),
    metadata: {
      ...(currentValue?.metadata ?? {}),
      ...metadataPatch,
    },
  };
}

async function upsertTaskStateMetadata({ stateBucket, taskId, metadataPatch, now }) {
  const key = taskStateKey(taskId);
  const current = await getRecord(stateBucket, key);
  const nextValue = mergeTaskMetadata(current?.value ?? { taskId }, metadataPatch);
  nextValue.taskId = nextValue.taskId ?? taskId;
  nextValue.updatedAt = asIsoString(now);

  if (!current) {
    const revision = await createRecord(stateBucket, key, nextValue);
    return {
      revision,
      value: nextValue,
    };
  }

  const revision = await updateRecord(stateBucket, key, nextValue, current.revision);
  return {
    revision,
    value: nextValue,
  };
}

function readWorkspaceBindingFromTask(taskState = {}) {
  const metadata = taskState?.metadata ?? {};
  return {
    workspaceType: metadata.workspace_type ?? null,
    workspacePath: metadata.workspace_path ?? null,
    directionalDoc: metadata.directional_doc ?? null,
  };
}

async function listDiscussionKeys(discussionBucket) {
  const keys = await discussionBucket.keys();
  const entries = [];
  for await (const key of keys) {
    entries.push(key);
  }

  return entries;
}

function participantKey(participant) {
  return `${participant.host}:${participant.agentId}`;
}

function normalizeParticipant(participant) {
  if (!participant?.host || !participant?.agentId) {
    return null;
  }

  return {
    host: assertSubjectToken('host', participant.host),
    agentId: assertSubjectToken('agentId', participant.agentId),
  };
}

function normalizeParticipants(participants = []) {
  const normalized = [];
  const seen = new Set();

  for (const participant of participants) {
    const nextParticipant = normalizeParticipant(participant);
    if (!nextParticipant) {
      continue;
    }

    const key = participantKey(nextParticipant);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(nextParticipant);
  }

  return normalized;
}

function removeParticipant(participants, participant) {
  const normalizedParticipant = normalizeParticipant(participant);
  if (!normalizedParticipant) {
    return normalizeParticipants(participants);
  }

  return normalizeParticipants(participants).filter(
    (entry) => participantKey(entry) !== participantKey(normalizedParticipant),
  );
}

function createBaseDiscussionState({ taskId, now, current = {}, workspaceBinding = {} }) {
  return {
    taskId,
    workspaceType: workspaceBinding.workspaceType ?? current.workspaceType ?? null,
    workspacePath: workspaceBinding.workspacePath ?? current.workspacePath ?? null,
    directionalDoc: workspaceBinding.directionalDoc ?? current.directionalDoc ?? null,
    participants: normalizeParticipants(current.participants ?? []),
    pendingRecipients: normalizeParticipants(current.pendingRecipients ?? []),
    lastEventKind: current.lastEventKind ?? null,
    status: current.status ?? 'acknowledged',
    updatedAt: asIsoString(now),
  };
}

async function upsertDiscussionState({ discussionBucket, taskId, buildNextState }) {
  const key = discussionStateKey(taskId);
  const current = await getRecord(discussionBucket, key);
  const nextValue = await buildNextState(current?.value ?? {});

  if (!current) {
    const revision = await createRecord(discussionBucket, key, nextValue);
    return {
      revision,
      ...nextValue,
    };
  }

  const revision = await updateRecord(discussionBucket, key, nextValue, current.revision);
  return {
    revision,
    ...nextValue,
  };
}

export async function bindTaskWorkspace({
  stateBucket,
  discussionBucket,
  taskId,
  workspacePath,
  workspaceType = 'research',
  directionalDoc = null,
  now = new Date(),
}) {
  await upsertTaskStateMetadata({
    stateBucket,
    taskId,
    metadataPatch: {
      workspace_type: workspaceType,
      workspace_path: workspacePath,
      directional_doc: directionalDoc,
    },
    now,
  });

  return upsertDiscussionState({
    discussionBucket,
    taskId,
    buildNextState(current) {
      const base = createBaseDiscussionState({
        taskId,
        now,
        current,
        workspaceBinding: {
          workspaceType,
          workspacePath,
          directionalDoc,
        },
      });
      return {
        ...base,
        workspaceType,
        workspacePath,
        directionalDoc,
      };
    },
  });
}

export async function getDiscussionState({ stateBucket, discussionBucket, taskId }) {
  const current = await getRecord(discussionBucket, discussionStateKey(taskId));
  if (!current?.value) {
    return null;
  }

  if (!stateBucket) {
    return current.value;
  }

  const taskState = await getRecord(stateBucket, taskStateKey(taskId));
  const workspaceBinding = readWorkspaceBindingFromTask(taskState?.value);
  return {
    ...current.value,
    ...workspaceBinding,
  };
}

export async function resolveTaskIdForWorkspacePath({
  discussionBucket,
  workspacePath,
}) {
  const keys = await listDiscussionKeys(discussionBucket);

  for (const key of keys) {
    const current = await getRecord(discussionBucket, key);
    if (current?.value?.workspacePath === workspacePath) {
      return {
        taskId: current.value.taskId,
        workspacePath: current.value.workspacePath,
        workspaceType: current.value.workspaceType ?? null,
        directionalDoc: current.value.directionalDoc ?? null,
      };
    }
  }

  return null;
}

export async function listDiscussionStates({
  stateBucket,
  discussionBucket,
  taskId,
  workspacePath,
  status = 'all',
}) {
  const keys = await listDiscussionKeys(discussionBucket);
  const discussions = [];

  for (const key of keys) {
    const current = await getRecord(discussionBucket, key);
    const currentTaskId = current?.value?.taskId;
    if (!currentTaskId) {
      continue;
    }

    if (taskId && currentTaskId !== taskId) {
      continue;
    }

    const discussion = await getDiscussionState({
      stateBucket,
      discussionBucket,
      taskId: currentTaskId,
    });
    if (!discussion) {
      continue;
    }

    if (workspacePath && discussion.workspacePath !== workspacePath) {
      continue;
    }

    if (status !== 'all' && discussion.status !== status) {
      continue;
    }

    discussions.push(discussion);
  }

  discussions.sort((left, right) => String(right.updatedAt ?? '').localeCompare(String(left.updatedAt ?? '')));

  return {
    discussions,
    summary: {
      threadCount: discussions.length,
      pendingCount: discussions.filter((entry) => entry.status === 'pending').length,
      staleCount: discussions.filter((entry) => entry.status === 'stale').length,
      workspaceBoundCount: discussions.filter((entry) => Boolean(entry.workspacePath)).length,
    },
  };
}

export async function projectDiscussionEvent({
  stateBucket,
  discussionBucket,
  taskId,
  eventKind,
  payload = {},
  now = new Date(),
}) {
  return upsertDiscussionState({
    discussionBucket,
    taskId,
    async buildNextState(current) {
      const taskState = stateBucket ? await getRecord(stateBucket, taskStateKey(taskId)) : null;
      const workspaceBinding = readWorkspaceBindingFromTask(taskState?.value);
      const base = createBaseDiscussionState({ taskId, now, current, workspaceBinding });
      const nextParticipants = normalizeParticipants(base.participants);
      let nextPendingRecipients = normalizeParticipants(base.pendingRecipients);
      let nextStatus = base.status;

      if (eventKind === 'message_posted') {
        nextParticipants.push(...normalizeParticipants([payload.author]));
        nextStatus = nextPendingRecipients.length > 0 ? nextStatus : 'acknowledged';
      } else if (eventKind === 'response_requested') {
        nextPendingRecipients = normalizeParticipants([
          ...nextPendingRecipients,
          ...(payload.recipients ?? []),
          ...(payload.recipient ? [payload.recipient] : []),
        ]);
        nextStatus = nextPendingRecipients.length > 0 ? 'pending' : 'acknowledged';
      } else if (eventKind === 'response_acknowledged') {
        nextParticipants.push(...normalizeParticipants([payload.recipient]));
        nextPendingRecipients = removeParticipant(nextPendingRecipients, payload.recipient);
        nextStatus = nextPendingRecipients.length > 0 ? 'pending' : 'acknowledged';
      } else if (eventKind === 'stale_warning') {
        nextPendingRecipients = normalizeParticipants(
          payload.recipients?.length ? payload.recipients : nextPendingRecipients,
        );
        nextStatus = nextPendingRecipients.length > 0 ? 'stale' : 'acknowledged';
      } else {
        throw new Error(`Unsupported discussion event kind: ${eventKind}`);
      }

      return {
        ...base,
        participants: normalizeParticipants(nextParticipants),
        pendingRecipients: nextPendingRecipients,
        lastEventKind: eventKind,
        status: nextStatus,
      };
    },
  });
}

export async function markStaleDiscussions({
  stateBucket,
  discussionBucket,
  taskId,
  workspacePath,
  now = new Date(),
  staleAfterSeconds = 300,
  publishEvent,
}) {
  const candidates = await listDiscussionStates({
    stateBucket,
    discussionBucket,
    taskId,
    workspacePath,
    status: 'pending',
  });
  const cutoffMs = (now instanceof Date ? now : new Date(now)).getTime() - (staleAfterSeconds * 1000);
  const staleMarked = [];

  for (const discussion of candidates.discussions) {
    const updatedAtMs = Date.parse(discussion.updatedAt ?? '');
    if (Number.isNaN(updatedAtMs) || updatedAtMs > cutoffMs) {
      continue;
    }

    const payload = {
      recipients: discussion.pendingRecipients ?? [],
    };
    const projection = await projectDiscussionEvent({
      stateBucket,
      discussionBucket,
      taskId: discussion.taskId,
      eventKind: 'stale_warning',
      payload,
      now,
    });

    if (publishEvent) {
      await publishEvent({
        taskId: discussion.taskId,
        eventKind: 'stale_warning',
        payload,
      });
    }

    staleMarked.push(projection);
  }

  return {
    discussions: staleMarked,
    summary: {
      staleMarkedCount: staleMarked.length,
    },
  };
}
