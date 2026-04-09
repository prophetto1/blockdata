#!/usr/bin/env node
import process from 'node:process';

import { close, connectCoordinationBus, getCoordinationInfrastructureStatus } from './lib/client.mjs';

async function main() {
  const bus = await connectCoordinationBus({
    clientName: 'coordination-smoke',
    connectionOptions: {
      maxReconnectAttempts: 0,
      timeout: 1500,
    },
  });

  try {
    const status = await getCoordinationInfrastructureStatus(bus);
    process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);

    if (!status.reachable) {
      throw new Error('Coordination broker is unreachable');
    }
    if (status.missingStreams.length > 0) {
      throw new Error(`Missing coordination stream(s): ${status.missingStreams.join(', ')}`);
    }
    if (status.missingBuckets.length > 0) {
      throw new Error(`Missing coordination KV bucket(s): ${status.missingBuckets.join(', ')}`);
    }
    if (status.contractMismatches.length > 0) {
      throw new Error(`Coordination contract drift detected: ${status.contractMismatches.join('; ')}`);
    }
  } finally {
    await close(bus);
  }
}

try {
  await main();
} catch (error) {
  process.stderr.write(`${String(error?.message ?? error)}\n`);
  process.exitCode = 1;
}
