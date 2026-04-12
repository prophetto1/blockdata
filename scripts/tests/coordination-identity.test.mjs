import test from 'node:test';
import assert from 'node:assert/strict';

const AGENT_MODULE_PATH = new URL('../../tools/coordination/lib/agent.mjs', import.meta.url);

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

  #nextRevision() {
    this.revision += 1;
    return this.revision;
  }
}

async function loadAgentModule() {
  return import(`${AGENT_MODULE_PATH.href}?t=${Date.now()}-${Math.random()}`);
}

function createPresenceRecord({
  host,
  identity,
  family = 'cdx',
  status = 'online',
  claimedAt = '2026-04-11T00:00:00.000Z',
  lastHeartbeatAt = '2026-04-11T00:00:00.000Z',
  expiresAt = '2026-04-11T00:02:00.000Z',
} = {}) {
  return {
    host,
    agentId: identity,
    family,
    status,
    claimedAt,
    lastHeartbeatAt,
    expiresAt,
  };
}

test('claimAgentIdentity claims the base family id when it is available', async () => {
  const { claimAgentIdentity } = await loadAgentModule();
  const presenceBucket = new InMemoryKvBucket();
  const now = new Date('2026-04-11T12:00:00.000Z');

  const result = await claimAgentIdentity({
    presenceBucket,
    host: 'JON',
    family: 'cdx',
    now,
    ttlSeconds: 120,
  });

  assert.equal(result.identity, 'cdx');
  assert.equal(result.claimed.identity, 'cdx');
  assert.equal(result.claimed.host, 'JON');

  const stored = await presenceBucket.get('agent.JON.cdx');
  assert.ok(stored, 'expected the base identity record to be created');
});

test('claimAgentIdentity increments suffixes when the base identity is already active', async () => {
  const { claimAgentIdentity } = await loadAgentModule();
  const presenceBucket = new InMemoryKvBucket();
  const now = new Date('2026-04-11T12:00:00.000Z');

  await presenceBucket.create(
    'agent.JON.cdx',
    new TextEncoder().encode(JSON.stringify(createPresenceRecord({
      host: 'JON',
      identity: 'cdx',
      expiresAt: '2026-04-11T12:05:00.000Z',
      lastHeartbeatAt: '2026-04-11T12:00:30.000Z',
    }))),
  );

  const result = await claimAgentIdentity({
    presenceBucket,
    host: 'JON',
    family: 'cdx',
    now,
    ttlSeconds: 120,
  });

  assert.equal(result.identity, 'cdx2');
  const stored = await presenceBucket.get('agent.JON.cdx2');
  assert.ok(stored, 'expected the suffixed identity record to be created');
});

test('claimAgentIdentity reclaims a stale identity lease before taking the next suffix', async () => {
  const { claimAgentIdentity } = await loadAgentModule();
  const presenceBucket = new InMemoryKvBucket();
  const now = new Date('2026-04-11T12:00:00.000Z');

  await presenceBucket.create(
    'agent.JON.cdx',
    new TextEncoder().encode(JSON.stringify(createPresenceRecord({
      host: 'JON',
      identity: 'cdx',
      expiresAt: '2026-04-11T11:58:00.000Z',
      lastHeartbeatAt: '2026-04-11T11:57:00.000Z',
    }))),
  );

  const result = await claimAgentIdentity({
    presenceBucket,
    host: 'JON',
    family: 'cdx',
    now,
    ttlSeconds: 120,
  });

  assert.equal(result.identity, 'cdx');
  assert.equal(result.reclaimed, true);

  const stored = await presenceBucket.get('agent.JON.cdx');
  const decoded = JSON.parse(new TextDecoder().decode(stored.value));
  assert.equal(decoded.expiresAt, '2026-04-11T12:02:00.000Z');
  assert.equal(decoded.lastHeartbeatAt, '2026-04-11T12:00:00.000Z');
});

test('claimAgentIdentity retries on create conflict and still finds an open suffix', async () => {
  const { claimAgentIdentity } = await loadAgentModule();
  const presenceBucket = new InMemoryKvBucket();
  const now = new Date('2026-04-11T12:00:00.000Z');

  await presenceBucket.create(
    'agent.JON.cdx',
    new TextEncoder().encode(JSON.stringify(createPresenceRecord({
      host: 'JON',
      identity: 'cdx',
      expiresAt: '2026-04-11T12:05:00.000Z',
    }))),
  );

  let firstCreateConflict = true;
  const originalCreate = presenceBucket.create.bind(presenceBucket);
  presenceBucket.create = async (key, value) => {
    if (firstCreateConflict && key === 'agent.JON.cdx2') {
      firstCreateConflict = false;
      await presenceBucket.create(
        'agent.JON.cdx2',
        new TextEncoder().encode(JSON.stringify(createPresenceRecord({
          host: 'JON',
          identity: 'cdx2',
          expiresAt: '2026-04-11T12:05:00.000Z',
        }))),
      );
      const error = new Error(`wrong last sequence for ${key}`);
      error.code = 'REVISION_CONFLICT';
      throw error;
    }

    return originalCreate(key, value);
  };

  const result = await claimAgentIdentity({
    presenceBucket,
    host: 'JON',
    family: 'cdx',
    now,
    ttlSeconds: 120,
  });

  assert.equal(result.identity, 'cdx3');
  const stored = await presenceBucket.get('agent.JON.cdx3');
  assert.ok(stored, 'expected claim retry to land on the next open suffix');
});

test('claimAgentIdentity fails after exhausting the configured suffix range', async () => {
  const { claimAgentIdentity } = await loadAgentModule();
  const presenceBucket = new InMemoryKvBucket();
  const now = new Date('2026-04-11T12:00:00.000Z');

  for (const identity of ['cdx', 'cdx2', 'cdx3', 'cdx4', 'cdx5', 'cdx6', 'cdx7', 'cdx8', 'cdx9', 'cdx10']) {
    await presenceBucket.create(
      `agent.JON.${identity}`,
      new TextEncoder().encode(JSON.stringify(createPresenceRecord({
        host: 'JON',
        identity,
        expiresAt: '2026-04-11T12:05:00.000Z',
      }))),
    );
  }

  await assert.rejects(
    () => claimAgentIdentity({
      presenceBucket,
      host: 'JON',
      family: 'cdx',
      now,
      ttlSeconds: 120,
    }),
    (error) => error?.code === 'identity_claim_exhausted',
  );
});

test('releaseAgentIdentity marks a claimed identity as released', async () => {
  const { claimAgentIdentity, releaseAgentIdentity } = await loadAgentModule();
  const presenceBucket = new InMemoryKvBucket();
  const claimTime = new Date('2026-04-11T12:00:00.000Z');
  const releaseTime = new Date('2026-04-11T12:01:00.000Z');

  await claimAgentIdentity({
    presenceBucket,
    host: 'JON',
    family: 'cdx',
    now: claimTime,
    ttlSeconds: 120,
  });

  const result = await releaseAgentIdentity({
    presenceBucket,
    host: 'JON',
    identity: 'cdx',
    now: releaseTime,
  });

  assert.equal(result.status, 'released');
  assert.equal(result.identity, 'cdx');

  const stored = await presenceBucket.get('agent.JON.cdx');
  const decoded = JSON.parse(new TextDecoder().decode(stored.value));
  assert.equal(decoded.status, 'released');
  assert.equal(decoded.releasedAt, '2026-04-11T12:01:00.000Z');
});

test('heartbeatAgentIdentity extends the lease for a claimed identity', async () => {
  const { claimAgentIdentity, heartbeatAgentIdentity } = await loadAgentModule();
  const presenceBucket = new InMemoryKvBucket();
  const claimTime = new Date('2026-04-11T12:00:00.000Z');
  const heartbeatTime = new Date('2026-04-11T12:01:00.000Z');

  await claimAgentIdentity({
    presenceBucket,
    host: 'JON',
    family: 'cdx',
    now: claimTime,
    ttlSeconds: 120,
  });

  const result = await heartbeatAgentIdentity({
    presenceBucket,
    host: 'JON',
    identity: 'cdx',
    now: heartbeatTime,
    ttlSeconds: 300,
  });

  assert.equal(result.status, 'online');
  assert.equal(result.identity, 'cdx');
  assert.equal(result.expiresAt, '2026-04-11T12:06:00.000Z');

  const stored = await presenceBucket.get('agent.JON.cdx');
  const decoded = JSON.parse(new TextDecoder().decode(stored.value));
  assert.equal(decoded.lastHeartbeatAt, '2026-04-11T12:01:00.000Z');
  assert.equal(decoded.expiresAt, '2026-04-11T12:06:00.000Z');
});
