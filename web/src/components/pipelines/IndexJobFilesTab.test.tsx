import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';

import { IndexJobFilesTab } from './IndexJobFilesTab';
import type { PipelineSource } from '@/lib/pipelineService';

const SOURCES: PipelineSource[] = [
  {
    pipeline_source_id: 'psrc-1',
    source_uid: 'source-1',
    project_id: 'project-1',
    doc_title: 'Alpha.md',
    source_type: 'md',
    byte_size: 101,
  },
  {
    pipeline_source_id: 'psrc-2',
    source_uid: 'source-2',
    project_id: 'project-1',
    doc_title: 'Beta.md',
    source_type: 'md',
    byte_size: 202,
  },
];

afterEach(() => {
  cleanup();
});

describe('IndexJobFilesTab', () => {
  it('renders a real files table with checkbox-driven membership', () => {
    const onToggleSource = vi.fn();

    render(
      <IndexJobFilesTab
        sources={SOURCES}
        selectedSourceUids={['source-1']}
        sourcesLoading={false}
        sourcesError={null}
        browserUploadProbeRun={null}
        onToggleSource={onToggleSource}
        onUpload={vi.fn()}
        onRemoveSource={vi.fn()}
      />,
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /include alpha\.md/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /include beta\.md/i })).not.toBeChecked();

    fireEvent.click(screen.getByRole('checkbox', { name: /include beta\.md/i }));
    expect(onToggleSource).toHaveBeenCalledWith('source-2');
  });

  it('only uploads markdown files from the picker', async () => {
    const onUpload = vi.fn().mockResolvedValue(undefined);

    render(
      <IndexJobFilesTab
        sources={SOURCES}
        selectedSourceUids={[]}
        sourcesLoading={false}
        sourcesError={null}
        browserUploadProbeRun={null}
        onToggleSource={vi.fn()}
        onUpload={onUpload}
        onRemoveSource={vi.fn()}
      />,
    );

    const dropzone = screen.getAllByText(/drop markdown files here/i)[0]?.closest('label');
    expect(dropzone).toBeInstanceOf(HTMLLabelElement);
    const markdown = new File(['# alpha'], 'Alpha.md', { type: 'text/markdown' });
    const text = new File(['hello'], 'notes.txt', { type: 'text/plain' });

    fireEvent.drop(dropzone!, {
      dataTransfer: {
        files: [markdown, text],
      },
    });

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledTimes(1);
    });

    expect(onUpload.mock.calls[0]?.[0]).toEqual([markdown]);
  });

  it('shows newly uploaded files as checked rows when the parent inserts them into selection', async () => {
    function Harness() {
      const [sources, setSources] = useState<PipelineSource[]>(SOURCES);
      const [selectedSourceUids, setSelectedSourceUids] = useState<string[]>([]);

      return (
        <IndexJobFilesTab
          sources={sources}
          selectedSourceUids={selectedSourceUids}
          sourcesLoading={false}
          sourcesError={null}
          browserUploadProbeRun={{
            probe_run_id: 'probe-run-1',
            probe_kind: 'pipeline_browser_upload_probe',
            check_id: null,
            result: 'ok',
            duration_ms: 12.4,
            evidence: {
              source_registry_verified: true,
              pipeline_source_id: 'psrc-uploaded-0',
            },
            failure_reason: null,
            created_at: '2026-04-08T19:10:00Z',
          }}
          onToggleSource={(sourceUid) => {
            setSelectedSourceUids((current) => (
              current.includes(sourceUid)
                ? current.filter((item) => item !== sourceUid)
                : current.concat(sourceUid)
            ));
          }}
          onUpload={async (files) => {
            const nextRows = files.map((file, index) => ({
              pipeline_source_id: `psrc-uploaded-${index}`,
              source_uid: `uploaded-${index}`,
              project_id: 'project-1',
              doc_title: file.name,
              source_type: 'md',
              byte_size: file.size,
            }));
            setSources((current) => current.concat(nextRows));
            setSelectedSourceUids((current) => current.concat(nextRows.map((row) => row.source_uid)));
          }}
          onRemoveSource={(sourceUid) => {
            setSelectedSourceUids((current) => current.filter((item) => item !== sourceUid));
          }}
        />
      );
    }

    render(<Harness />);

    const dropzone = screen.getAllByText(/drop markdown files here/i)[0]?.closest('label');
    expect(dropzone).toBeInstanceOf(HTMLLabelElement);
    const markdown = new File(['# gamma'], 'Gamma.md', { type: 'text/markdown' });

    fireEvent.drop(dropzone!, {
      dataTransfer: {
        files: [markdown],
      },
    });

    expect(await screen.findByRole('checkbox', { name: /include gamma\.md/i })).toBeChecked();
  });

  it('surfaces the latest backend-owned upload proof next to the mounted file workbench', () => {
    render(
      <IndexJobFilesTab
        sources={SOURCES}
        selectedSourceUids={['source-1']}
        sourcesLoading={false}
        sourcesError={null}
        browserUploadProbeRun={{
          probe_run_id: 'probe-run-2',
          probe_kind: 'pipeline_browser_upload_probe',
          check_id: null,
          result: 'ok',
          duration_ms: 18.9,
          evidence: {
            source_uid: 'source-1',
            pipeline_source_id: 'psrc-1',
            source_registry_verified: true,
          },
          failure_reason: null,
          created_at: '2026-04-08T19:15:00Z',
        }}
        onToggleSource={vi.fn()}
        onUpload={vi.fn()}
        onRemoveSource={vi.fn()}
      />,
    );

    expect(screen.getByText(/latest backend upload proof verified pipeline source registration/i)).toBeInTheDocument();
    expect(screen.getByText(/psrc-1/i)).toBeInTheDocument();
  });
});
