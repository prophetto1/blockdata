import type { KVRow } from './kvTypes';

export const KV_MOCK_ROWS: KVRow[] = [
  {
    namespace: 'default',
    key: 'openai.model',
    type: 'STRING',
    value: 'gpt-5',
    description: 'Default model for orchestration prompts.',
    updateDate: '2026-02-24T21:30:00.000Z',
  },
  {
    namespace: 'default',
    key: 'pipeline.timeout',
    type: 'DURATION',
    value: 'PT10M',
    description: 'Global timeout for long-running tasks.',
    updateDate: '2026-02-23T18:15:00.000Z',
  },
  {
    namespace: 'jon',
    key: 'notifications.enabled',
    type: 'BOOLEAN',
    value: 'true',
    description: 'Enable flow notifications in project jon.',
    updateDate: '2026-02-26T09:42:00.000Z',
  },
  {
    namespace: 'jon',
    key: 'extract.batch.size',
    type: 'NUMBER',
    value: '500',
    description: 'Batch size for extraction task.',
    updateDate: '2026-02-21T12:21:00.000Z',
  },
  {
    namespace: 'asde-bbbbb',
    key: 'api.base.url',
    type: 'STRING',
    value: 'https://api.example.io/v1',
    description: 'Primary API endpoint for project integration.',
    updateDate: '2026-02-22T06:07:00.000Z',
  },
  {
    namespace: 'asde-bbbbb',
    key: 'retention.policy',
    type: 'JSON',
    value: '{"days":90,"legalHold":false}',
    description: 'Retention policy override.',
    updateDate: '2026-02-25T04:15:00.000Z',
    expirationDate: '2026-08-31T00:00:00.000Z',
  },
];

