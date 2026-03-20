import { describe, expect, it, vi, beforeEach } from 'vitest';

const { platformApiFetch } = vi.hoisted(() => ({
  platformApiFetch: vi.fn(),
}));

vi.mock('@/lib/platformApi', () => ({
  platformApiFetch,
}));

import { createHttpObservabilityApiClient } from './httpAdapter';

describe('createHttpObservabilityApiClient', () => {
  beforeEach(() => {
    platformApiFetch.mockReset();
  });

  it('normalizes nested resource service.name fields for traces and spans', async () => {
    platformApiFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          traces: [
            {
              traceId: 'trace-1',
              name: 'request',
              resource: {
                'service.name': 'platform-api',
              },
              spans: [
                {
                  spanId: 'span-1',
                  name: 'root',
                  resource: {
                    'service.name': 'platform-api',
                  },
                },
              ],
            },
          ],
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );

    const client = createHttpObservabilityApiClient();
    const result = await client.fetchTraces();

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.serviceName).toBe('platform-api');
    expect(result.items[0]?.spans[0]?.serviceName).toBe('platform-api');
  });
});
