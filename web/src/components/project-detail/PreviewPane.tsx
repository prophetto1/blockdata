import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Stack,
  Text,
} from '@mantine/core';
import { IconDownload, IconFileText } from '@tabler/icons-react';
import { DocxPreview } from '@/components/documents/DocxPreview';
import { PdfPreview } from '@/components/documents/PdfPreview';
import { PptxPreview } from '@/components/documents/PptxPreview';
import type { ProjectDocumentRow, PreviewKind } from '@/lib/projectDetailHelpers';

type PreviewPaneProps = {
  selectedDoc: ProjectDocumentRow | null;
  previewLoading: boolean;
  previewError: string | null;
  previewKind: PreviewKind;
  previewUrl: string | null;
  previewText: string | null;
  pdfToolbarHost: HTMLDivElement | null;
  isMarkdownTextPreview: boolean;
};

export function PreviewPane({
  selectedDoc,
  previewLoading,
  previewError,
  previewKind,
  previewUrl,
  previewText,
  pdfToolbarHost,
  isMarkdownTextPreview,
}: PreviewPaneProps) {
  return (
    <>
      {!selectedDoc && (
        <Center h="100%">
          <Text size="sm" c="dimmed">Select a document to preview.</Text>
        </Center>
      )}

      {selectedDoc && previewLoading && (
        <Center h="100%">
          <Stack align="center" gap="xs">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">Loading preview...</Text>
          </Stack>
        </Center>
      )}

      {selectedDoc && !previewLoading && previewError && (
        <Box p="sm">
          <Alert color="red" variant="light">
            {previewError}
          </Alert>
        </Box>
      )}

      {selectedDoc && !previewLoading && previewKind === 'pdf' && previewUrl && (
        <PdfPreview
          key={`${selectedDoc.source_uid}:${previewUrl}`}
          title={selectedDoc.doc_title}
          url={previewUrl}
          hideToolbar={!pdfToolbarHost}
          toolbarPortalTarget={pdfToolbarHost}
        />
      )}

      {selectedDoc && !previewLoading && previewKind === 'image' && previewUrl && (
        <Center h="100%">
          <img src={previewUrl} alt={selectedDoc.doc_title} className="parse-preview-image" />
        </Center>
      )}

      {selectedDoc && !previewLoading && previewKind === 'text' && (
        <Box className="parse-text-preview">
          {isMarkdownTextPreview && (
            <Group justify="space-between" wrap="nowrap" className="parse-text-preview-header">
              <Group gap={6} wrap="nowrap" className="parse-text-preview-file">
                <IconFileText size={14} />
                <Text size="xs" className="parse-text-preview-filename" title={selectedDoc.doc_title}>
                  {selectedDoc.doc_title}
                </Text>
              </Group>
              {previewUrl && (
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  component="a"
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  download
                  aria-label="Download markdown"
                >
                  <IconDownload size={14} />
                </ActionIcon>
              )}
            </Group>
          )}
          <pre className="parse-preview-text">{previewText ?? ''}</pre>
        </Box>
      )}

      {selectedDoc && !previewLoading && previewKind === 'docx' && previewUrl && (
        <DocxPreview
          key={`${selectedDoc.source_uid}:${previewUrl}`}
          title={selectedDoc.doc_title}
          url={previewUrl}
        />
      )}

      {selectedDoc && !previewLoading && previewKind === 'pptx' && previewUrl && (
        <PptxPreview
          key={`${selectedDoc.source_uid}:${previewUrl}`}
          title={selectedDoc.doc_title}
          url={previewUrl}
        />
      )}

      {selectedDoc && !previewLoading && previewKind === 'file' && (
        <Center h="100%">
          <Stack align="center" gap="xs" p="md">
            <Text size="sm" c="dimmed" ta="center">
              Preview not supported for this format.
            </Text>
            {previewUrl && (
              <Button
                component="a"
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                size="xs"
                variant="light"
              >
                Open file
              </Button>
            )}
          </Stack>
        </Center>
      )}
    </>
  );
}