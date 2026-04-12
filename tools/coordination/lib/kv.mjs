import {
  TaskRevisionConflictError,
  assertSubjectToken,
} from './contracts.mjs';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function taskStateKey(taskId) {
  return `task.${assertSubjectToken('taskId', taskId)}`;
}

export function taskParticipantsKey(taskId) {
  return `task.${assertSubjectToken('taskId', taskId)}`;
}

export function taskClaimKey(taskId) {
  return `task.${assertSubjectToken('taskId', taskId)}`;
}

export function agentPresenceKey(host, agentId) {
  return `agent.${assertSubjectToken('host', host)}.${assertSubjectToken('agentId', agentId)}`;
}

export function agentIdentityCandidate(family, attempt = 1) {
  const normalizedFamily = assertSubjectToken('family', family);
  if (!Number.isInteger(attempt) || attempt < 1) {
    throw new RangeError('attempt must be an integer greater than or equal to 1');
  }

  return attempt === 1
    ? normalizedFamily
    : assertSubjectToken('agentId', `${normalizedFamily}${attempt}`);
}

export function agentIdentityKey(host, family, attempt = 1) {
  return agentPresenceKey(host, agentIdentityCandidate(family, attempt));
}

export function encodeJson(value) {
  return encoder.encode(JSON.stringify(value));
}

export function decodeJson(value) {
  if (value == null) {
    return null;
  }

  if (typeof value === 'string') {
    return JSON.parse(value);
  }

  return JSON.parse(decoder.decode(value));
}

export async function getRecord(bucket, key) {
  const entry = await bucket.get(key);
  if (!entry) {
    return null;
  }

  return {
    revision: entry.revision,
    value: decodeJson(entry.value),
  };
}

export async function createRecord(bucket, key, value) {
  return bucket.create(key, encodeJson(value));
}

function isRevisionConflict(error) {
  const message = String(error?.message ?? '');
  return error?.code === 'REVISION_CONFLICT' || /wrong last sequence|revision conflict|sequence mismatch/i.test(message);
}

export async function updateRecord(bucket, key, value, revision) {
  try {
    return await bucket.update(key, encodeJson(value), revision);
  } catch (error) {
    if (isRevisionConflict(error)) {
      throw new TaskRevisionConflictError(`Revision conflict while updating ${key}`, {
        cause: error,
        code: 'revision_conflict',
        details: { key, revision },
      });
    }

    throw error;
  }
}
