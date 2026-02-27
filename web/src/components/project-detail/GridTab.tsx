import { Box, Button, Center, Group, Stack, Text } from '@mantine/core';
import { BlockViewerGridRDG } from '@/components/blocks/BlockViewerGridRDG';
import type { ProjectDocumentRow } from '@/lib/projectDetailHelpers';
import type { RunWithSchema } from '@/lib/types';

type GridTabProps = {
  selectedDoc: ProjectDocumentRow | null;
  selectedRunId: string | null;
  selectedRun: RunWithSchema | null;
  outputsNotice: string | null;
  outputsError: string | null;
  runCitationsBusy: boolean;
  hasCitationsOutput: boolean;
  onRunCitations: () => void;
};

export function GridTab({
  selectedDoc,
  selectedRunId,
  selectedRun,
  outputsNotice,
  outputsError,
  runCitationsBusy,
  hasCitationsOutput,
  onRunCitations,
}: GridTabProps) {
  return (
    <Box style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {!selectedDoc ? (
        <Center h="100%">
          <Text size="sm" c="dimmed" ta="center">
            Select a document to view parsed blocks.
          </Text>
        </Center>
      ) : !selectedDoc.conv_uid ? (
        <Center h="100%">
          <Text size="sm" c="dimmed" ta="center">
            No parsed blocks are available for this document yet.
          </Text>
        </Center>
      ) : (
        <Stack gap="xs" h="100%" p="sm">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border border-slate-300/70 bg-slate-100/55 px-2 py-1 dark:border-slate-600/60 dark:bg-slate-900/20">
            <Group gap="xs" align="center" wrap="nowrap" className="min-w-0">
              <Text size="sm" fw={700}>Grid</Text>
              <Text size="xs" c="dimmed">React Data Grid</Text>
            </Group>
            <div className="inline-flex items-stretch overflow-hidden border border-slate-300/80 bg-slate-100/80 dark:border-slate-600/60 dark:bg-slate-900/35" role="tablist" aria-label="Static tabs">
              <button type="button" role="tab" aria-selected className="h-6 border-r border-slate-300/70 bg-sky-100 px-3 text-[11px] font-semibold leading-none text-sky-800 dark:border-slate-600/60 dark:bg-sky-900/35 dark:text-sky-200" tabIndex={-1}>
                Tab One
              </button>
              <button type="button" role="tab" aria-selected={false} className="h-6 px-3 text-[11px] font-semibold leading-none text-slate-700 dark:text-slate-200" tabIndex={-1}>
                Tab Two
              </button>
            </div>
            <div className="justify-self-end">
              <Button
                size="xs"
                variant="default"
                onClick={() => onRunCitations()}
                loading={runCitationsBusy}
              >
                {hasCitationsOutput ? 'Regenerate citations' : 'Run citations'}
              </Button>
            </div>
          </div>
          {(outputsNotice || outputsError) && (
            <Text size="xs" c={outputsError ? 'red' : 'dimmed'}>
              {outputsError ?? outputsNotice}
            </Text>
          )}
          <Box style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <BlockViewerGridRDG
              convUid={selectedDoc.conv_uid}
              selectedRunId={selectedRunId}
              selectedRun={selectedRun}
            />
          </Box>
        </Stack>
      )}
    </Box>
  );
}