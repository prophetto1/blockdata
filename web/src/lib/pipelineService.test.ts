import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createPipelineJob,
  downloadPipelineDeliverable,
  getLatestPipelineJob,
  listPipelineDefinitions,
  listPipelineSources,
  uploadPipelineSource,
} from './pipelineService';

const platformApiFetchMock = vi.fn();
const prepareSourceUploadMock = vi.fn();
const fetchMock = vi.fn();

vi.mock('@/lib/platformApi', () => ({
  platformApiFetch: (...args: unknown[]) => platformApiFetchMock(...args),
}));

vi.mock('@/lib/storageUploadService', () => ({
  prepareSourceUpload: (...args: unknown[]) => prepareSourceUploadMock(...args),
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('pipelineService', () => {
  beforeEach(() => {
    platformApiFetchMock.mockReset();
    prepareSourceUploadMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists pipeline definitions and uploaded sources', async () => {
    platformApiFetchMock
      .mockResolvedValueOnce(jsonResponse({
        items: [
          {
            pipeline_kind: 'markdown_index_builder',
            label: 'Index Builder',
            supports_manual_trigger: true,
            eligible_source_types: ['md', 'markdown'],
            deliverable_kinds: ['lexical_sqlite', 'semantic_zip'],
          },
        ],
      }))
      .mockResolvedValueOnce(jsonResponse({
        items: [
          {
            pipeline_source_id: 'psrc-1',
            source_uid: 'source-1',
            project_id: 'project-1',
            doc_title: 'Guide.md',
            source_type: 'md',
            byte_size: 128,
            created_at: '2026-03-28T00:00:00Z',
          },
        ],
      }));

    await expect(listPipelineDefinitions()).resolves.toEqual([
      {
        pipeline_kind: 'markdown_index_builder',
        label: 'Index Builder',
        supports_manual_trigger: true,
        eligible_source_types: ['md', 'markdown'],
        deliverable_kinds: ['lexical_sqlite', 'semantic_zip'],
      },
    ]);

    await expect(listPipelineSources({
      pipelineKind: 'markdown_index_builder',
      projectId: 'project-1',
    })).resolves.toEqual([
      {
        pipeline_source_id: 'psrc-1',
        source_uid: 'source-1',
        project_id: 'project-1',
        doc_title: 'Guide.md',
        source_type: 'md',
        byte_size: 128,
        created_at: '2026-03-28T00:00:00Z',
      },
    ]);

    expect(platformApiFetchMock).toHaveBeenNthCalledWith(1, '/pipelines/definitions');
    expect(platformApiFetchMock).toHaveBeenNthCalledWith(
      2,
      '/pipelines/markdown_index_builder/sources?project_id=project-1',
    );
  });

  it('creates jobs, hydrates latest job state, and downloads deliverables', async () => {
    platformApiFetchMock
      .mockResolvedValueOnce(jsonResponse({
        job_id: 'job-1',
        pipeline_kind: 'markdown_index_builder',
        source_set_id: 'set-1',
        status: 'queued',
        stage: 'queued',
      }, 202))
      .mockResolvedValueOnce(jsonResponse({
        job: {
          job_id: 'job-1',
          pipeline_kind: 'markdown_index_builder',
          source_set_id: 'set-1',
          status: 'complete',
          stage: 'packaging',
          deliverables: [],
        },
      }))
      .mockResolvedValueOnce(new Response(new Blob(['hello']), {
        status: 200,
        headers: { 'Content-Type': 'application/zip' },
      }));

    await expect(createPipelineJob({
      pipelineKind: 'markdown_index_builder',
      sourceSetId: 'set-1',
    })).resolves.toEqual({
      job_id: 'job-1',
      pipeline_kind: 'markdown_index_builder',
      source_set_id: 'set-1',
      status: 'queued',
      stage: 'queued',
    });

    await expect(getLatestPipelineJob({
      pipelineKind: 'markdown_index_builder',
      sourceSetId: 'set-1',
    })).resolves.toEqual({
      job_id: 'job-1',
      pipeline_kind: 'markdown_index_builder',
      source_set_id: 'set-1',
      status: 'complete',
      stage: 'packaging',
      deliverables: [],
    });

    const blob = await downloadPipelineDeliverable({
      jobId: 'job-1',
      deliverableKind: 'semantic_zip',
    });

    expect(blob).toBeInstanceOf(Blob);
    expect(platformApiFetchMock).toHaveBeenNthCalledWith(
      1,
      '/pipelines/markdown_index_builder/jobs',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(platformApiFetchMock).toHaveBeenNthCalledWith(
      2,
      '/pipelines/markdown_index_builder/jobs/latest?source_set_id=set-1',
    );
    expect(platformApiFetchMock).toHaveBeenNthCalledWith(
      3,
      '/pipelines/jobs/job-1/deliverables/semantic_zip/download',
    );
  });

  it('uploads markdown sources through the pipeline-services storage surface', async () => {
    const file = new File(['# hello'], 'notes.md', { type: 'text/markdown' });
    prepareSourceUploadMock.mockResolvedValue({
      filename: 'notes.md',
      content_type: 'text/markdown',
      expected_bytes: 7,
      storage_kind: 'source',
      source_type: 'md',
      source_uid: 'source-1',
      doc_title: 'notes.md',
    });
    platformApiFetchMock
      .mockResolvedValueOnce(jsonResponse({
        reservation_id: 'res-1',
        signed_upload_url: 'https://upload.example/res-1',
      }))
      .mockResolvedValueOnce(jsonResponse({
        storage_object_id: 'obj-1',
        object_key: 'users/user-1/pipeline-services/index-builder/projects/project-1/sources/source-1/source/notes.md',
        byte_size: 7,
      }));
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    await expect(uploadPipelineSource({
      projectId: 'project-1',
      serviceSlug: 'index-builder',
      file,
    })).resolves.toEqual({
      sourceUid: 'source-1',
      reservation: {
        reservation_id: 'res-1',
        signed_upload_url: 'https://upload.example/res-1',
      },
      completed: {
        storage_object_id: 'obj-1',
        object_key: 'users/user-1/pipeline-services/index-builder/projects/project-1/sources/source-1/source/notes.md',
        byte_size: 7,
      },
    });

    expect(platformApiFetchMock).toHaveBeenNthCalledWith(
      1,
      '/storage/uploads',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          project_id: 'project-1',
          filename: 'notes.md',
          content_type: 'text/markdown',
          expected_bytes: 7,
          storage_kind: 'source',
          source_type: 'md',
          source_uid: 'source-1',
          doc_title: 'notes.md',
          storage_surface: 'pipeline-services',
          storage_service_slug: 'index-builder',
        }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith('https://upload.example/res-1', expect.objectContaining({
      method: 'PUT',
      headers: { 'Content-Type': 'text/markdown' },
      body: file,
    }));
    expect(platformApiFetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/pipelines/markdown_index_builder/jobs'),
      expect.anything(),
    );
  });

  it('cancels its reservation when the signed upload request throws', async () => {
    const file = new File(['# hello'], 'notes.md', { type: 'text/markdown' });
    prepareSourceUploadMock.mockResolvedValue({
      filename: 'notes.md',
      content_type: 'text/markdown',
      expected_bytes: 7,
      storage_kind: 'source',
      source_type: 'md',
      source_uid: 'source-1',
      doc_title: 'notes.md',
    });
    platformApiFetchMock
      .mockResolvedValueOnce(jsonResponse({
        reservation_id: 'res-1',
        signed_upload_url: 'https://upload.example/res-1',
      }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    await expect(uploadPipelineSource({
      projectId: 'project-1',
      serviceSlug: 'index-builder',
      file,
    })).rejects.toThrow('network down');

    expect(platformApiFetchMock).toHaveBeenNthCalledWith(
      1,
      '/storage/uploads',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          project_id: 'project-1',
          filename: 'notes.md',
          content_type: 'text/markdown',
          expected_bytes: 7,
          storage_kind: 'source',
          source_type: 'md',
          source_uid: 'source-1',
          doc_title: 'notes.md',
          storage_surface: 'pipeline-services',
          storage_service_slug: 'index-builder',
        }),
      }),
    );
    expect(platformApiFetchMock).toHaveBeenNthCalledWith(
      2,
      '/storage/uploads/res-1',
      { method: 'DELETE' },
    );
  });

  it('cancels a conflicting pending reservation and retries pipeline uploads once', async () => {
    const file = new File(['# hello'], 'notes.md', { type: 'text/markdown' });
    prepareSourceUploadMock.mockResolvedValue({
      filename: 'notes.md',
      content_type: 'text/markdown',
      expected_bytes: 7,
      storage_kind: 'source',
      source_type: 'md',
      source_uid: 'source-1',
      doc_title: 'notes.md',
    });
    platformApiFetchMock
      .mockResolvedValueOnce(jsonResponse({
        detail: {
          code: 'pending_reservation_exists',
          reservation_id: 'res-stale',
        },
      }, 409))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse({
        reservation_id: 'res-2',
        signed_upload_url: 'https://upload.example/res-2',
      }))
      .mockResolvedValueOnce(jsonResponse({
        storage_object_id: 'obj-2',
        object_key: 'users/user-1/pipeline-services/index-builder/projects/project-1/sources/source-1/source/notes.md',
        byte_size: 7,
      }));
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    await expect(uploadPipelineSource({
      projectId: 'project-1',
      serviceSlug: 'index-builder',
      file,
    })).resolves.toEqual({
      sourceUid: 'source-1',
      reservation: {
        reservation_id: 'res-2',
        signed_upload_url: 'https://upload.example/res-2',
      },
      completed: {
        storage_object_id: 'obj-2',
        object_key: 'users/user-1/pipeline-services/index-builder/projects/project-1/sources/source-1/source/notes.md',
        byte_size: 7,
      },
    });

    expect(platformApiFetchMock).toHaveBeenNthCalledWith(
      1,
      '/storage/uploads',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(platformApiFetchMock).toHaveBeenNthCalledWith(
      2,
      '/storage/uploads/res-stale',
      { method: 'DELETE' },
    );
    expect(platformApiFetchMock).toHaveBeenNthCalledWith(
      3,
      '/storage/uploads',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(platformApiFetchMock).toHaveBeenNthCalledWith(
      4,
      '/storage/uploads/res-2/complete',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
