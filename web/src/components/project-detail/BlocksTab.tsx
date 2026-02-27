import type { CSSProperties } from 'react';
import { Box, Center, Text, Loader } from '@mantine/core';
import { resolveOverlayColors } from '@/lib/doclingOverlayColors';
import type { BlockTypeRegistry } from '@/hooks/useBlockTypeRegistry';
import type { ProjectDocumentRow, TestBlockCardRow } from '@/lib/projectDetailHelpers';

type BlocksTabProps = {
  selectedDoc: ProjectDocumentRow | null;
  testBlocks: TestBlockCardRow[];
  testBlocksLoading: boolean;
  testBlocksError: string | null;
  blockTypeRegistry: BlockTypeRegistry | null;
};

export function BlocksTab({
  selectedDoc,
  testBlocks,
  testBlocksLoading,
  testBlocksError,
  blockTypeRegistry,
}: BlocksTabProps) {
  return (
    <Box className="parse-docling-results-list">
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
      ) : testBlocksLoading ? (
        <Center h="100%">
          <Loader size="sm" />
        </Center>
      ) : testBlocksError ? (
        <Center h="100%">
          <Text size="sm" c="red" ta="center">
            {testBlocksError}
          </Text>
        </Center>
      ) : testBlocks.length === 0 ? (
        <Center h="100%">
          <Text size="sm" c="dimmed" ta="center">
            Parsed blocks returned empty for this document.
          </Text>
        </Center>
      ) : (
        testBlocks.map((block) => {
          const overlayColors = resolveOverlayColors(
            block.blockType,
            block.parserBlockType,
            null,
            blockTypeRegistry?.overlayBorder,
            blockTypeRegistry?.overlayBg,
          );
          const cardStyle = {
            '--parse-block-card-accent': overlayColors.border,
            '--parse-block-card-fill': overlayColors.bg,
          } as CSSProperties;
          return (
            <Box key={block.blockUid} className="parse-docling-results-item" style={cardStyle}>
              <Text size="xs" fw={700}>
                {block.blockType} | #{block.blockIndex}
              </Text>
              <Text size="xs" c="dimmed" lineClamp={3}>
                {block.snippet || '[no text]'}
              </Text>
            </Box>
          );
        })
      )}
    </Box>
  );
}
