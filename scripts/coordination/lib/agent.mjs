import { randomUUID } from 'node:crypto';

import {
  BufferedForRetryError,
  CoordinationUnavailableError,
  DEFAULT_OUTBOX_MAX_BYTES,
  KV_BUCKETS,
  TaskClaimRequiredError,
  TaskRevisionConflictError,
} from './contracts.mjs';
import { getCoordinationInfrastructureStatus } from './client.mjs';
import {
  agentPresenceKey,
  createRecord,
  getRecord,
  taskClaimKey,
  taskParticipantsKey,
  taskStateKey,
  updateRecord,
} from './kv.mjs';
import {
  getOutboxBacklog,
  appendBufferedEvent,
  flushLocalOutbox as flushOutboxFiles,
} from './outbox.mjs';
import {
  buildHeartbeatSubject,
  buildProbeSubject,
  buildTaskEventSubject,
  buildTaskEventWatchSubject,
} from './subjects.mjs';

function normalizeNow(value = new Date()) {
  return value instanceof Date ? value : new Date(value);
}

function asIsoString(value = new Date()) {
  return normalizeNow(value).toISOString();
}

function createClaimValue({ taskId, host, agentId, now, ttlSeconds }) {
  const claimedAt = asIsoString(now);
  const expiresAt = new Date(normalizeNow(now).getTime() + ttlSeconds * 1000).toISOString();

  return {
    taskId,
    status: 'claimed',
    claimedAt,
    expiresAt,
    claimedBy: { host, agentId },
  };
}

function hasActiveClaim(claimRecord) {
  if (!claimRecord?.value || claimRecord.value.status !== 'claimed') {
    return false;
  }

  return true;
}

function assertClaimOwner(claimRecord, { taskId, host, agentId, now }) {
  if (!hasActiveClaim(claimRecord, now)) {
    throw new TaskClaimRequiredError(`Task ${taskId} requires an active claim`, {
      code: 'task_claim_required',
      details: { taskId, host, agentId },
    });
  }

  if (
    claimRecord.value.claimedBy.host !== host
    || claimRecord.value.claimedBy.agentId !== agentId
  ) {
    throw new TaskClaimRequiredError(`Task ${taskId} is not claimed by ${host}/${agentId}`, {
      code: 'task_claim_required',
      details: {
        taskId,
        host,
        agentId,
        claimedBy: claimRecord.value.claimedBy,
      },
    });
  }
}

async function upsertJsonRecord(bucket, key, value) {
  const current = await getRecord(bucket, key);
  if (!current) {
    const revision = await createRecord(bucket, key, value);
    return { revision, value };
  }

  const revision = await updateRecord(bucket, key, value, current.revision);
  return { revision, value };
}

async function recordParticipant({ participantBucket, taskId, host, agentId, now }) {
  if (!participantBucket) {
    return null;
  }

  const key = taskParticipantsKey(taskId);
  const current = await getRecord(participantBucket, key);
  const participants = Array.isArray(current?.value?.participants)
    ? current.value.participants.filter(
      (entry) => !(entry.host === host && entry.agentId === agentId),
    )
    : [];

  participants.push({
    host,
    agentId,
    lastSeenAt: asIsoString(now),
  });

  const nextValue = {
    taskId,
    participants,
    updatedAt: asIsoString(now),
  };

  if (!current) {
    await createRecord(participantBucket, key, nextValue);
  } else {
    await updateRecord(participantBucket, key, nextValue, current.revision);
  }

  return nextValue;
}

function isRecoverablePublishFailure(error) {
  return !(
    error instanceof BufferedForRetryError
    || error instanceof CoordinationUnavailableError
  );
}

export async function heartbeatPresence({
  presenceBucket,
  bus,
  host,
  agentId,
  status = 'online',
  details = {},
  now = new Date(),
}) {
  const payload = {
    host,
    agentId,
    status,
    details,
    lastHeartbeatAt: asIsoString(now),
  };

  if (presenceBucket) {
    await upsertJsonRecord(presenceBucket, agentPresenceKey(host, agentId), payload);
  }

  if (bus?.enabled) {
    await bus.publishRaw({
      subject: buildHeartbeatSubject(host, agentId),
      eventId: `${host}-${agentId}-${normalizeNow(now).getTime()}`,
      payload,
    });
  }

  return payload;
}

export async function openCoordinationBuckets({ bus }) {
  const [stateBucket, participantBucket, presenceBucket, claimBucket] = await Promise.all([
    bus.kv(KV_BUCKETS.TASK_STATE),
    bus.kv(KV_BUCKETS.TASK_PARTICIPANTS),
    bus.kv(KV_BUCKETS.AGENT_PRESENCE),
    bus.kv(KV_BUCKETS.TASK_CLAIMS),
  ]);

  return {
    stateBucket,
    participantBucket,
    presenceBucket,
    claimBucket,
  };
}

export async function createTask({
  stateBucket,
  taskId,
  host,
  agentId,
  task = {},
  now = new Date(),
}) {
  const value = {
    taskId,
    status: task.status ?? 'created',
    createdAt: asIsoString(now),
    createdBy: { host, agentId },
    ...task,
  };

  const revision = await createRecord(stateBucket, taskStateKey(taskId), value);
  return {
    revision,
    ...value,
  };
}

export async function claimTask({
  claimBucket,
  participantBucket,
  taskId,
  host,
  agentId,
  now = new Date(),
  ttlSeconds = 120,
}) {
  const key = taskClaimKey(taskId);
  const nextValue = createClaimValue({ taskId, host, agentId, now, ttlSeconds });
  const current = await getRecord(claimBucket, key);

  let revision;
  if (!current) {
    revision = await createRecord(claimBucket, key, nextValue);
  } else if (hasActiveClaim(current, now)) {
    const sameOwner = current.value.claimedBy.host === host && current.value.claimedBy.agentId === agentId;
    if (!sameOwner) {
      throw new TaskRevisionConflictError(`Task ${taskId} is already claimed by ${current.value.claimedBy.host}/${current.value.claimedBy.agentId}`, {
        code: 'task_claim_conflict',
        details: {
          taskId,
          claimedBy: current.value.claimedBy,
        },
      });
    }

    revision = await updateRecord(claimBucket, key, nextValue, current.revision);
  } else {
    revision = await updateRecord(claimBucket, key, nextValue, current.revision);
  }

  await recordParticipant({ participantBucket, taskId, host, agentId, now });

  return {
    status: 'claimed',
    revision,
    taskId,
    claimedBy: nextValue.claimedBy,
    claimedAt: nextValue.claimedAt,
    expiresAt: nextValue.expiresAt,
  };
}

export async function releaseTask({
  claimBucket,
  taskId,
  host,
  agentId,
  now = new Date(),
}) {
  const key = taskClaimKey(taskId);
  const current = await getRecord(claimBucket, key);
  assertClaimOwner(current, { taskId, host, agentId, now });

  const nextValue = {
    ...current.value,
    status: 'released',
    releasedAt: asIsoString(now),
    releasedBy: { host, agentId },
  };
  const revision = await updateRecord(claimBucket, key, nextValue, current.revision);

  return {
    status: 'released',
    revision,
    taskId,
  };
}

export async function getTaskState({ stateBucket, taskId }) {
  const current = await getRecord(stateBucket, taskStateKey(taskId));
  return current?.value ?? null;
}

export async function patchTaskState({
  claimBucket,
  stateBucket,
  taskId,
  host,
  agentId,
  patch,
  now = new Date(),
}) {
  const claimRecord = await getRecord(claimBucket, taskClaimKey(taskId));
  assertClaimOwner(claimRecord, { taskId, host, agentId, now });

  const key = taskStateKey(taskId);
  const current = await getRecord(stateBucket, key);
  const nextValue = {
    taskId,
    ...(current?.value ?? {}),
    ...patch,
    updatedAt: asIsoString(now),
    updatedBy: { host, agentId },
  };

  const revision = current
    ? await updateRecord(stateBucket, key, nextValue, current.revision)
    : await createRecord(stateBucket, key, nextValue);

  return {
    revision,
    ...nextValue,
  };
}

export async function completeTask({
  claimBucket,
  stateBucket,
  taskId,
  host,
  agentId,
  completion = {},
  now = new Date(),
}) {
  const claimRecord = await getRecord(claimBucket, taskClaimKey(taskId));
  assertClaimOwner(claimRecord, { taskId, host, agentId, now });

  const result = await patchTaskState({
    claimBucket,
    stateBucket,
    taskId,
    host,
    agentId,
    patch: {
      status: 'completed',
      completedAt: asIsoString(now),
      completedBy: { host, agentId },
      ...completion,
    },
    now,
  });

  await updateRecord(
    claimBucket,
    taskClaimKey(taskId),
    {
      ...claimRecord.value,
      status: 'completed',
      completedAt: asIsoString(now),
      completedBy: { host, agentId },
    },
    claimRecord.revision,
  );

  return {
    status: 'completed',
    revision: result.revision,
    taskId,
  };
}

export async function publishTaskEvent({
  bus,
  runtimeRoot = bus?.config?.runtimeRoot,
  outboxMaxBytes = bus?.config?.outboxMaxBytes ?? DEFAULT_OUTBOX_MAX_BYTES,
  taskId,
  eventKind,
  payload,
  host,
  agentId,
  now = new Date(),
  eventId = randomUUID(),
}) {
  const subject = buildTaskEventSubject(taskId, eventKind);
  const event = {
    eventId,
    taskId,
    eventKind,
    subject,
    host,
    agentId,
    occurredAt: asIsoString(now),
    payload,
  };

  try {
    const ack = await bus.publishRaw({
      subject,
      payload: event,
      eventId,
    });

    return {
      status: 'published',
      subject,
      eventId,
      duplicate: Boolean(ack?.duplicate),
    };
  } catch (error) {
    if (!isRecoverablePublishFailure(error)) {
      throw error;
    }

    if (!runtimeRoot || !host || !agentId) {
      throw new CoordinationUnavailableError('Broker publish failed and no local outbox path is available', {
        cause: error,
        code: 'coordination_unavailable',
        details: { subject, eventId },
      });
    }

    try {
      await appendBufferedEvent({
        runtimeRoot,
        host,
        agentId,
        event: {
          ...event,
          bufferedAt: asIsoString(now),
        },
        maxBytes: outboxMaxBytes,
        timestamp: now,
      });
    } catch (bufferError) {
      if (bufferError instanceof CoordinationUnavailableError) {
        throw bufferError;
      }

      throw new CoordinationUnavailableError('Broker publish failed and the event could not be buffered safely', {
        cause: bufferError,
        code: 'coordination_unavailable',
        details: { subject, eventId },
      });
    }

    throw new BufferedForRetryError(`Buffered coordination event ${eventId} for retry`, {
      cause: error,
      code: 'buffered_for_retry',
      details: { subject, eventId },
    });
  }
}

export async function brokerProbe({
  bus,
  host,
  agentId,
  now = new Date(),
  payload = {},
  eventId = randomUUID(),
}) {
  const message = {
    eventId,
    host,
    agentId,
    probedAt: asIsoString(now),
    payload,
  };

  const ack = await bus.publishRaw({
    subject: buildProbeSubject(),
    payload: message,
    eventId,
  });

  return {
    status: 'probed',
    eventId,
    duplicate: Boolean(ack?.duplicate),
    subject: buildProbeSubject(),
  };
}

export function watchTaskEvents({ bus, taskId, onEvent, signal }) {
  return bus.subscribe(buildTaskEventWatchSubject(taskId), {
    signal,
    onMessage: async (event, message) => {
      await onEvent?.(event, message);
    },
  });
}

export async function getCoordinationStatus({
  bus,
  runtimeRoot = bus?.config?.runtimeRoot,
  host,
  agentId,
}) {
  const infrastructure = await getCoordinationInfrastructureStatus(bus);
  const outbox = host && agentId
    ? await getOutboxBacklog({ runtimeRoot, host, agentId })
    : null;

  return {
    ...infrastructure,
    runtimeRoot,
    outbox,
  };
}

export async function flushLocalOutbox({
  bus,
  runtimeRoot = bus?.config?.runtimeRoot,
  host,
  agentId,
}) {
  return flushOutboxFiles({
    runtimeRoot,
    host,
    agentId,
    publishEvent: async (record) => {
      await bus.publishRaw({
        subject: record.subject,
        payload: record,
        eventId: record.eventId,
      });
    },
  });
}

export async function close(bus) {
  await bus?.close?.();
}
