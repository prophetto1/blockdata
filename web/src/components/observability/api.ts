import { featureFlags } from '@/lib/featureFlags';
import { createHttpObservabilityApiClient } from './realtime/httpAdapter';
import { isSignalRTransportEnabled } from './realtime/signalrAdapter';
import type { ObservabilityApiClient } from './realtime/types';

let observabilityApiClient: ObservabilityApiClient | null = null;

export function createObservabilityApiClient(): ObservabilityApiClient {
  if (observabilityApiClient) {
    return observabilityApiClient;
  }

  // Keep a simple switch point for SignalR in the future.
  if (featureFlags.observabilitySignalRUrl && isSignalRTransportEnabled(featureFlags.observabilitySignalRUrl)) {
    // Keep the client contract stable by preserving the HTTP client for now.
    // SignalR transport can be inserted behind this adapter layer without page refactors.
    observabilityApiClient = createHttpObservabilityApiClient();
    return observabilityApiClient;
  }

  observabilityApiClient = createHttpObservabilityApiClient();
  return observabilityApiClient;
}
