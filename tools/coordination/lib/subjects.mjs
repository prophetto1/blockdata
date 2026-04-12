import { InvalidRoutingScopeError, assertSubjectToken } from './contracts.mjs';

const TASK_EVENT_RE = /^coord\.tasks\.([A-Za-z0-9_-]+)\.event\.([A-Za-z0-9_-]+)$/;
const TASK_COMMAND_RE = /^coord\.tasks\.([A-Za-z0-9_-]+)\.command\.([A-Za-z0-9_-]+)$/;
const TASK_EVENT_WATCH_RE = /^coord\.tasks\.([A-Za-z0-9_-]+)\.event\.\*$/;
const HEARTBEAT_RE = /^coord\.sessions\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.heartbeat$/;
const STATUS_RE = /^coord\.sessions\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.status$/;
const PROBE_RE = /^coord\.system\.probe$/;
const APP_EVENT_RE = /^app\.platform\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/;

export function buildTaskEventSubject(taskId, eventKind) {
  return `coord.tasks.${assertSubjectToken('taskId', taskId)}.event.${assertSubjectToken('eventKind', eventKind)}`;
}

export function buildTaskEventWatchSubject(taskId) {
  return `coord.tasks.${assertSubjectToken('taskId', taskId)}.event.*`;
}

export function buildTaskCommandSubject(taskId, commandName) {
  return `coord.tasks.${assertSubjectToken('taskId', taskId)}.command.${assertSubjectToken('commandName', commandName)}`;
}

export function buildHeartbeatSubject(host, agentId) {
  return `coord.sessions.${assertSubjectToken('host', host)}.${assertSubjectToken('agentId', agentId)}.heartbeat`;
}

export function buildStatusSubject(host, agentId) {
  return `coord.sessions.${assertSubjectToken('host', host)}.${assertSubjectToken('agentId', agentId)}.status`;
}

export function buildProbeSubject() {
  return 'coord.system.probe';
}

export function buildAppPlatformSubject(domain, eventKind) {
  return `app.platform.${assertSubjectToken('domain', domain)}.${assertSubjectToken('eventKind', eventKind)}`;
}

export function isAllowedSubject(subject) {
  return (
    TASK_EVENT_RE.test(subject)
    || TASK_COMMAND_RE.test(subject)
    || HEARTBEAT_RE.test(subject)
    || STATUS_RE.test(subject)
    || PROBE_RE.test(subject)
    || APP_EVENT_RE.test(subject)
  );
}

export function isAllowedWatchSubject(subject) {
  return isAllowedSubject(subject) || TASK_EVENT_WATCH_RE.test(subject);
}

export function assertAllowedSubject(subject) {
  if (!isAllowedSubject(subject)) {
    throw new InvalidRoutingScopeError(`Subject is outside the locked coordination taxonomy: ${subject}`, {
      code: 'invalid_routing_scope',
      details: { subject },
    });
  }

  return subject;
}

export function assertAllowedWatchSubject(subject) {
  if (!isAllowedWatchSubject(subject)) {
    throw new InvalidRoutingScopeError(`Watch subject is outside the locked coordination taxonomy: ${subject}`, {
      code: 'invalid_routing_scope',
      details: { subject },
    });
  }

  return subject;
}
