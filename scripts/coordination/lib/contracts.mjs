import path from 'node:path';

export const STREAMS = Object.freeze({
  COORD_EVENTS: 'COORD_EVENTS',
});

export const KV_BUCKETS = Object.freeze({
  TASK_STATE: 'COORD_TASK_STATE',
  TASK_PARTICIPANTS: 'COORD_TASK_PARTICIPANTS',
  AGENT_PRESENCE: 'COORD_AGENT_PRESENCE',
  TASK_CLAIMS: 'COORD_TASK_CLAIMS',
});

export const DEFAULT_COORDINATION_NATS_URL = 'nats://127.0.0.1:4222';
export const DEFAULT_RUNTIME_ROOT = path.join('.codex-tmp', 'coordination-runtime');
export const DEFAULT_OUTBOX_MAX_BYTES = 32 * 1024 * 1024;
export const OUTBOX_DIRECTORY_NAME = 'coordination-outbox';
export const AUDIT_DIRECTORY_NAME = 'coordination-audit';

const SUBJECT_TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/;

class CoordinationError extends Error {
  constructor(message, options = {}) {
    super(message, options);
    this.name = new.target.name;
    if (options.code) {
      this.code = options.code;
    }
    if (Object.hasOwn(options, 'details')) {
      this.details = options.details;
    }
  }
}

export class CoordinationUnavailableError extends CoordinationError {}
export class BufferedForRetryError extends CoordinationError {}
export class TaskRevisionConflictError extends CoordinationError {}
export class InvalidRoutingScopeError extends CoordinationError {}
export class TaskClaimRequiredError extends CoordinationError {}

export function isValidSubjectToken(value) {
  return typeof value === 'string' && value.length > 0 && SUBJECT_TOKEN_PATTERN.test(value);
}

export function assertSubjectToken(name, value) {
  if (!isValidSubjectToken(value)) {
    throw new InvalidRoutingScopeError(
      `${name} must match ${SUBJECT_TOKEN_PATTERN} and may not contain dots or whitespace`,
      { code: 'invalid_routing_scope', details: { name, value } },
    );
  }

  return value;
}
