import { Center, Stack, Text, Loader } from '@mantine/core';
import { PdfResultsHighlighter, type ParsedResultBlock } from '@/components/documents/PdfResultsHighlighter';
import { isPdfDocument } from '@/lib/projectDetailHelpers';
import type { ProjectDocumentRow, PreviewKind } from '@/lib/projectDetailHelpers';

type MetadataTabProps = {
  selectedDoc: ProjectDocumentRow | null;
  previewUrl: string | null;
  previewKind: PreviewKind;
  previewLoading: boolean;
  resultsDoclingJsonUrl: string | null;
  resultsDoclingLoading: boolean;
  resultsDoclingError: string | null;
  activeResultsBlockId: string | null;
  showAllBboxes: boolean;
  showMetadataBlocksPanel: boolean;
  onActiveResultsBlockIdChange: (id: string | null) => void;
  onShowAllBboxesChange: (show: boolean) => void;
  onShowMetadataBlocksPanelChange: (show: boolean) => void;
  onResultsBlocksChange: (blocks: ParsedResultBlock[]) => void;
};

export function MetadataTab({
  selectedDoc,
  previewUrl,
  previewKind,
  previewLoading,
  resultsDoclingJsonUrl,
  resultsDoclingLoading,
  resultsDoclingError,
  activeResultsBlockId,
  showAllBboxes,
  showMetadataBlocksPanel,
  onActiveResultsBlockIdChange,
  onShowAllBboxesChange,
  onShowMetadataBlocksPanelChange,
  onResultsBlocksChange,
}: MetadataTabProps) {
  return (
    <>
      {!selectedDoc && (
        <Center h="100%">
          <Text size="sm" c="dimmed" ta="center">
            Select a document to view parse results.
          </Text>
        </Center>
      )}

      {selectedDoc && isPdfDocument(selectedDoc) && !selectedDoc.conv_uid && (
        <Center h="100%">
          <Text size="sm" c="dimmed" ta="center">
            No parsed result artifacts exist for this file yet (status: {selectedDoc.status}).
          </Text>
        </Center>
      )}

      {selectedDoc && !isPdfDocument(selectedDoc) && (
        <Center h="100%">
          <Text size="sm" c="dimmed" ta="center">
            Parse results preview is currently enabled for PDFs.
          </Text>
        </Center>
      )}

      {selectedDoc && isPdfDocument(selectedDoc) && selectedDoc.conv_uid && (
        <>
          {(previewLoading || resultsDoclingLoading) && (
            <Center h="100%">
              <Stack align="center" gap="xs">
                <Loader size="sm" />
                <Text size="sm" c="dimmed">Loading parsed PDF results...</Text>
              </Stack>
            </Center>
          )}

          {!previewLoading && !resultsDoclingLoading && (!previewUrl || previewKind !== 'pdf') && (
            <Center h="100%">
              <Text size="sm" c="dimmed" ta="center">
                PDF preview is unavailable for this parsed document.
              </Text>
            </Center>
          )}

          {!previewLoading && !resultsDoclingLoading && previewKind === 'pdf' && previewUrl && resultsDoclingError && (
            <Center h="100%">
              <Text size="sm" c="dimmed" ta="center">
                {resultsDoclingError}
              </Text>
            </Center>
          )}

          {!previewLoading
            && !resultsDoclingLoading
            && previewKind === 'pdf'
            && previewUrl
            && resultsDoclingJsonUrl
            && selectedDoc.conv_uid && (
              <PdfResultsHighlighter
                key={`${selectedDoc.source_uid}:${selectedDoc.conv_uid}:${resultsDoclingJsonUrl}`}
                title={selectedDoc.doc_title}
                pdfUrl={previewUrl}
                doclingJsonUrl={resultsDoclingJsonUrl}
                convUid={selectedDoc.conv_uid}
                activeHighlightId={activeResultsBlockId}
                onActiveHighlightIdChange={onActiveResultsBlockIdChange}
                showAllBoundingBoxes={showAllBboxes}
                onShowAllBoundingBoxesChange={onShowAllBboxesChange}
                showBlocksPanel={showMetadataBlocksPanel}
                onShowBlocksPanelChange={onShowMetadataBlocksPanelChange}
                onBlocksChange={onResultsBlocksChange}
              />
          )}
        </>
      )}
    </>
  );
}
