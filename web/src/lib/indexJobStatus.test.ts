import { describe, expect, it } from 'vitest';
import { deriveIndexJobStatus } from './indexJobStatus';

describe('deriveIndexJobStatus', () => {
  it('returns empty when sourceSet is null', () => {
    expect(deriveIndexJobStatus(null, null, false)).toBe('empty');
  });

  it('returns draft when hasUnsavedChanges is true', () => {
    expect(
      deriveIndexJobStatus({ source_set_id: 'set-1', member_count: 2 }, null, true),
    ).toBe('draft');
  });

  it('returns draft when source_set_id is null (unpersisted)', () => {
    expect(
      deriveIndexJobStatus({ source_set_id: null, member_count: 2 }, false as never, false),
    ).toBe('draft');
  });

  it('returns invalid when saved but member_count is 0', () => {
    expect(
      deriveIndexJobStatus({ source_set_id: 'set-1', member_count: 0 }, null, false),
    ).toBe('invalid');
  });

  it('returns ready when saved, has files, and no latest job', () => {
    expect(
      deriveIndexJobStatus({ source_set_id: 'set-1', member_count: 3 }, null, false),
    ).toBe('ready');
  });

  it('returns running when latest job status is queued', () => {
    expect(
      deriveIndexJobStatus(
        { source_set_id: 'set-1', member_count: 3 },
        { status: 'queued' },
        false,
      ),
    ).toBe('running');
  });

  it('returns running when latest job status is running', () => {
    expect(
      deriveIndexJobStatus(
        { source_set_id: 'set-1', member_count: 3 },
        { status: 'running' },
        false,
      ),
    ).toBe('running');
  });

  it('returns failed when latest job status is failed', () => {
    expect(
      deriveIndexJobStatus(
        { source_set_id: 'set-1', member_count: 3 },
        { status: 'failed' },
        false,
      ),
    ).toBe('failed');
  });

  it('returns complete when latest job status is complete', () => {
    expect(
      deriveIndexJobStatus(
        { source_set_id: 'set-1', member_count: 3 },
        { status: 'complete' },
        false,
      ),
    ).toBe('complete');
  });

  it('returns ready as fallback for unknown job status', () => {
    expect(
      deriveIndexJobStatus(
        { source_set_id: 'set-1', member_count: 3 },
        { status: 'unknown_status' },
        false,
      ),
    ).toBe('ready');
  });
});
