import { assertEquals, assertMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { extractBlocks } from "./markdown.ts";

Deno.test("extractBlocks includes parser-native mdast metadata", () => {
  const input = "# Title\n\nParagraph text.\n\n- One\n- Two\n";
  const result = extractBlocks(input);

  assertEquals(result.blocks.length >= 3, true);

  assertEquals(result.blocks[0].block_type, "heading");
  assertEquals(result.blocks[0].parser_block_type, "heading");
  assertMatch(result.blocks[0].parser_path, /^\$\.children\[\d+\]$/);

  const paragraph = result.blocks.find((b) => b.block_type === "paragraph");
  assertEquals(!!paragraph, true);
  assertEquals(paragraph?.parser_block_type, "paragraph");
  assertMatch(paragraph?.parser_path ?? "", /^\$\.children\[\d+\]$/);

  const listItem = result.blocks.find((b) => b.block_type === "list_item");
  assertEquals(!!listItem, true);
  assertEquals(listItem?.parser_block_type, "listItem");
  assertMatch(listItem?.parser_path ?? "", /^\$\.children\[\d+\]\.children\[\d+\]$/);
});
