import { Box, Button, Center, Group, Loader, Stack, Text } from '@mantine/core';
import type { ProjectDocumentRow } from '@/lib/projectDetailHelpers';

export type OutputDownloadKind = 'docling' | 'markdown' | 'html' | 'doctags' | 'citations';

export type OutputFileRow = {
  kind: OutputDownloadKind;
  name: string | null;
  available: boolean;
};

type OutputsTabProps = {
  selectedDoc: ProjectDocumentRow | null;
  loading: boolean;
  error: string | null;
  files: OutputFileRow[];
  downloadBusy: OutputDownloadKind | null;
  onDownload: (kind: OutputDownloadKind) => void;
};

const FALLBACK_LABELS: Record<OutputDownloadKind, string> = {
  docling: '[docling json unavailable]',
  markdown: '[markdown unavailable]',
  html: '[html unavailable]',
  doctags: '[doctags unavailable]',
  citations: '[citations unavailable]',
};

export function OutputsTab({
  selectedDoc,
  loading,
  error,
  files,
  downloadBusy,
  onDownload,
}: OutputsTabProps) {
  return (
    <Box className="parse-text-preview">
      {!selectedDoc && (
        <Center h="100%">
          <Text size="sm" c="dimmed" ta="center">
            Select a document to view parser outputs.
          </Text>
        </Center>
      )}

      {selectedDoc && !selectedDoc.conv_uid && (
        <Center h="100%">
          <Text size="sm" c="dimmed" ta="center">
            No parsed outputs are available for this document yet.
          </Text>
        </Center>
      )}

      {selectedDoc && selectedDoc.conv_uid && loading && (
        <Center h="100%">
          <Stack align="center" gap="xs">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">Loading parser outputs...</Text>
          </Stack>
        </Center>
      )}

      {selectedDoc && selectedDoc.conv_uid && !loading && error && (
        <Center h="100%">
          <Text size="sm" c="red" ta="center">
            {error}
          </Text>
        </Center>
      )}

      {selectedDoc
        && selectedDoc.conv_uid
        && !loading
        && !error && (
          <Stack gap="xs" p="sm">
            <Text size="sm" fw={700}>Output Files</Text>
            {files.map((file) => (
              <Group key={file.kind} justify="space-between" wrap="nowrap">
                <Text size="sm" c={file.available ? undefined : 'dimmed'}>
                  {file.name ?? FALLBACK_LABELS[file.kind]}
                </Text>
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => onDownload(file.kind)}
                  loading={downloadBusy === file.kind}
                  disabled={!file.available}
                >
                  Download
                </Button>
              </Group>
            ))}
          </Stack>
        )}
    </Box>
  );
}