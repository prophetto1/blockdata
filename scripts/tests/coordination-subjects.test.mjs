import test from 'node:test';
import assert from 'node:assert/strict';

async function loadModule() {
  return import('../coordination/lib/subjects.mjs').catch(() => ({}));
}

test('builds subjects for each locked coordination family', async () => {
  const {
    buildTaskEventSubject,
    buildTaskCommandSubject,
    buildHeartbeatSubject,
    buildStatusSubject,
    buildProbeSubject,
    buildAppPlatformSubject,
  } = await loadModule();

  assert.equal(buildTaskEventSubject('e2e-001', 'progress'), 'coord.tasks.e2e-001.event.progress');
  assert.equal(buildTaskCommandSubject('e2e-001', 'claim'), 'coord.tasks.e2e-001.command.claim');
  assert.equal(buildHeartbeatSubject('JON', 'codex'), 'coord.sessions.JON.codex.heartbeat');
  assert.equal(buildStatusSubject('BUDDY', 'claude'), 'coord.sessions.BUDDY.claude.status');
  assert.equal(buildProbeSubject(), 'coord.system.probe');
  assert.equal(buildAppPlatformSubject('runtime', 'changed'), 'app.platform.runtime.changed');
});

test('recognizes subjects that stay inside the locked routing scope', async () => {
  const { assertAllowedSubject } = await loadModule();

  assert.equal(assertAllowedSubject('coord.tasks.e2e-001.event.progress'), 'coord.tasks.e2e-001.event.progress');
  assert.equal(assertAllowedSubject('coord.tasks.e2e-001.command.claim'), 'coord.tasks.e2e-001.command.claim');
  assert.equal(assertAllowedSubject('coord.sessions.JON.codex.heartbeat'), 'coord.sessions.JON.codex.heartbeat');
  assert.equal(assertAllowedSubject('coord.sessions.BUDDY.cc.status'), 'coord.sessions.BUDDY.cc.status');
  assert.equal(assertAllowedSubject('coord.system.probe'), 'coord.system.probe');
});

test('rejects off-contract subjects and invalid subject tokens', async () => {
  const {
    assertAllowedSubject,
    buildTaskEventSubject,
  } = await loadModule();

  assert.throws(() => assertAllowedSubject('coord.tasks.e2e-001.progress'), /locked coordination taxonomy/i);
  assert.throws(() => assertAllowedSubject('coord.random.scope'), /locked coordination taxonomy/i);
  assert.throws(() => buildTaskEventSubject('task.with.dot', 'progress'), /may not contain dots/i);
  assert.throws(() => buildTaskEventSubject('e2e-001', 'not allowed'), /may not contain dots|whitespace/i);
});
