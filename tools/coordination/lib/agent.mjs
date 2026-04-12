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
  agentIdentityCandidate,
  agentIdentityKey,
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

function cloneIdentityLeaseDetails(details = {}) {
  const normalized = { ...details };

  if (details?.sessionClassification && typeof details.sessionClassification === 'object') {
    normalized.sessionClassification = {
      ...details.sessionClassification,
      provenance:
        details.sessionClassification?.provenance
        && typeof details.sessionClassification.provenance === 'object'
          ? { ...details.sessionClassification.provenance }
          : details.sessionClassification.provenance,
    };
  }

  return normalized;
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

function createIdentityLeaseValue({
  host,
  identity,
  family,
  sessionAgentId = null,
  status = 'online',
  details = {},
  now,
  ttlSeconds,
}) {
  const claimedAt = asIsoString(now);
  const expiresAt = new Date(normalizeNow(now).getTime() + ttlSeconds * 1000).toISOString();

  return {
    host,
    agentId: identity,
    identity,
    family,
    sessionAgentId,
    status,
    details: cloneIdentityLeaseDetails(details),
    claimedAt,
    lastHeartbeatAt: claimedAt,
    expiresAt,
  };
}

function hasExpiredLease(expiresAt, now) {
  if (!expiresAt) {
    return false;
  }

  const expiresAtMs = Date.parse(expiresAt);
  if (Number.isNaN(expiresAtMs)) {
    return false;
  }

  return expiresAtMs <= normalizeNow(now).getTime();
}

function isIdentityLeaseActive(value, now) {
  if (!value || value.status === 'released') {
    return false;
  }

  return !hasExpiredLease(value.expiresAt, now);
}

function isRevisionConflictError(error) {
  return error instanceof TaskRevisionConflictError
    || error?.code === 'REVISION_CONFLICT'
    || error?.code === 'revision_conflict';
}

function createIdentityClaimRequiredError({ host, identity }) {
  const error = new Error(`Identity ${identity} is not currently claimed on host ${host}`);
  error.code = 'identity_claim_required';
  error.details = { host, identity };
  return error;
}

function createIdentityClaimExhaustedError({ host, family, maxAttempts }) {
  const error = new Error(`Identity family ${family} is exhausted on host ${host}`);
  error.code = 'identity_claim_exhausted';
  error.details = { host, family, maxAttempts };
  return error;
}

function deriveIdentityFamily(value) {
  const explicitFamily = value?.family;
  if (explicitFamily) {
    return explicitFamily;
  }

  const identity = String(value?.identity ?? value?.agentId ?? '');
  if (!identity) {
    return null;
  }

  return identity.replace(/\d+$/, '') || identity;
}

async function listBucketKeys(bucket) {
  const iter = await bucket.keys();
  const keys = [];
  for await (const key of iter) {
    keys.push(key);
  }

  return keys;
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

export async function claimAgentIdentity({
  presenceBucket,
  host,
  family,
  sessionAgentId = null,
  status = 'online',
  details = {},
  ttlSeconds = 120,
  maxAttempts = 10,
  now = new Date(),
}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const identity = agentIdentityCandidate(family, attempt);
    const key = agentIdentityKey(host, family, attempt);
    const current = await getRecord(presenceBucket, key);
    const nextValue = createIdentityLeaseValue({
      host,
      identity,
      family,
      sessionAgentId,
      status,
      details,
      now,
      ttlSeconds,
    });

    if (!current) {
      try {
        const revision = await createRecord(presenceBucket, key, nextValue);
        return {
          status: 'claimed',
          identity,
          family,
          revision,
          reclaimed: false,
          claimed: nextValue,
        };
      } catch (error) {
        if (isRevisionConflictError(error)) {
          continue;
        }

        throw error;
      }
    }

    if (isIdentityLeaseActive(current.value, now)) {
      continue;
    }

    try {
      const revision = await updateRecord(presenceBucket, key, nextValue, current.revision);
      return {
        status: 'claimed',
        identity,
        family,
        revision,
        reclaimed: true,
        claimed: nextValue,
      };
    } catch (error) {
      if (isRevisionConflictError(error)) {
        continue;
      }

      throw error;
    }
  }

  throw createIdentityClaimExhaustedError({ host, family, maxAttempts });
}

export async function releaseAgentIdentity({
  presenceBucket,
  host,
  identity,
  now = new Date(),
}) {
  const key = agentPresenceKey(host, identity);
  const current = await getRecord(presenceBucket, key);
  if (!current?.value) {
    throw createIdentityClaimRequiredError({ host, identity });
  }

  const nextValue = {
    ...current.value,
    status: 'released',
    releasedAt: asIsoString(now),
    expiresAt: asIsoString(now),
  };
  const revision = await updateRecord(presenceBucket, key, nextValue, current.revision);

  return {
    status: 'released',
    identity,
    revision,
    releasedAt: nextValue.releasedAt,
  };
}

export async function heartbeatAgentIdentity({
  presenceBucket,
  host,
  identity,
  ttlSeconds = 120,
  now = new Date(),
  status,
  details,
}) {
  const key = agentPresenceKey(host, identity);
  const current = await getRecord(presenceBucket, key);
  if (!current?.value) {
    throw createIdentityClaimRequiredError({ host, identity });
  }

  const nextValue = {
    ...current.value,
    status: status ?? current.value.status ?? 'online',
    details: details ?? current.value.details ?? {},
    lastHeartbeatAt: asIsoString(now),
    expiresAt: new Date(normalizeNow(now).getTime() + ttlSeconds * 1000).toISOString(),
  };
  const revision = await updateRecord(presenceBucket, key, nextValue, current.revision);

  return {
    status: nextValue.status,
    identity,
    revision,
    lastHeartbeatAt: nextValue.lastHeartbeatAt,
    expiresAt: nextValue.expiresAt,
  };
}

export async function listAgentIdentities({
  presenceBucket,
  host,
  family,
  includeStale = true,
  now = new Date(),
}) {
  const keys = await listBucketKeys(presenceBucket);
  const filteredKeys = keys.filter((key) => {
    if (!key.startsWith('agent.')) {
      return false;
    }

    if (host && !key.startsWith(`agent.${host}.`)) {
      return false;
    }

    return true;
  });

  const identities = [];
  for (const key of filteredKeys) {
    const record = await getRecord(presenceBucket, key);
    if (!record?.value) {
      continue;
    }

    const identity = String(record.value.identity ?? record.value.agentId ?? '');
    const derivedFamily = deriveIdentityFamily(record.value);
    if (family && derivedFamily !== family) {
      continue;
    }

    const stale = !isIdentityLeaseActive(record.value, now);
    if (!includeStale && stale) {
      continue;
    }

    identities.push({
      identity,
      host: record.value.host ?? host ?? null,
      family: derivedFamily,
      sessionAgentId: record.value.sessionAgentId ?? null,
      claimedAt: record.value.claimedAt ?? null,
      lastHeartbeatAt: record.value.lastHeartbeatAt ?? null,
      expiresAt: record.value.expiresAt ?? null,
      stale,
      revision: record.revision,
    });
  }

  identities.sort((left, right) => left.identity.localeCompare(right.identity));

  const familyCounts = {};
  const hostSet = new Set();
  let activeCount = 0;
  let staleCount = 0;
  for (const entry of identities) {
    hostSet.add(entry.host);
    if (entry.family) {
      familyCounts[entry.family] = (familyCounts[entry.family] ?? 0) + 1;
    }

    if (entry.stale) {
      staleCount += 1;
    } else {
      activeCount += 1;
    }
  }

  return {
    identities,
    summary: {
      activeCount,
      staleCount,
      hostCount: hostSet.size,
      familyCounts,
    },
  };
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
  const [stateBucket, participantBucket, presenceBucket, claimBucket, discussionBucket] = await Promise.all([
    bus.kv(KV_BUCKETS.TASK_STATE),
    bus.kv(KV_BUCKETS.TASK_PARTICIPANTS),
    bus.kv(KV_BUCKETS.AGENT_PRESENCE),
    bus.kv(KV_BUCKETS.TASK_CLAIMS),
    bus.kv(KV_BUCKETS.DISCUSSION_STATE),
  ]);

  return {
    stateBucket,
    participantBucket,
    presenceBucket,
    claimBucket,
    discussionBucket,
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
