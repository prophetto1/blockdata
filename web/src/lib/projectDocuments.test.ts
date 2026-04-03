import { describe, expect, it } from 'vitest';

import { fetchAllProjectDocuments } from './projectDocuments';

describe('fetchAllProjectDocuments', () => {
  it('scopes view_documents reads to the assets document surface', async () => {
    const eqCalls: Array<[string, string]> = [];
    const queryChain = {
      select: () => queryChain,
      eq: (column: string, value: string) => {
        eqCalls.push([column, value]);
        return queryChain;
      },
      order: () => queryChain,
      range: async () => ({
        data: [
          { source_uid: 'source-1', doc_title: 'Guide.md' },
        ],
        error: null,
      }),
    };
    const client = {
      from: () => queryChain,
    };

    const rows = await fetchAllProjectDocuments({
      projectId: 'project-1',
      select: 'source_uid, doc_title',
      client,
    });

    expect(rows).toEqual([{ source_uid: 'source-1', doc_title: 'Guide.md' }]);
    expect(eqCalls).toEqual([
      ['project_id', 'project-1'],
      ['document_surface', 'assets'],
    ]);
  });

  it('returns an empty list when no project is selected', async () => {
    await expect(
      fetchAllProjectDocuments({
        projectId: '',
        select: '*',
      }),
    ).resolves.toEqual([]);
  });
});
