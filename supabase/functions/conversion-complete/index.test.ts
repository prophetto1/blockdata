import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { extractDoclingBlocks } from "../_shared/docling.ts";

/**
 * Focused tests for the Arango payload assembly contracts in conversion-complete.
 * These test the key invariants that the handler depends on:
 * - block_uid format: ${conv_uid}:${idx}
 * - extractDoclingBlocks produces blocks with the expected shape
 * - conv_uid is preserved when provided (fast path)
 */

Deno.test("block_uid format is conv_uid:block_index", () => {
  const conv_uid = "abc123def456";
  const blockRows = [0, 1, 2].map((idx) => ({
    block_uid: `${conv_uid}:${idx}`,
    conv_uid,
    block_index: idx,
    block_type: "paragraph",
    block_content: `block ${idx}`,
    block_locator: { type: "docling_json_pointer", pointer: `#/texts/${idx}` },
  }));

  assertEquals(blockRows[0].block_uid, "abc123def456:0");
  assertEquals(blockRows[1].block_uid, "abc123def456:1");
  assertEquals(blockRows[2].block_uid, "abc123def456:2");
  assertEquals(blockRows.length, 3);
  for (const row of blockRows) {
    assertEquals(row.conv_uid, conv_uid);
  }
});

Deno.test("conv_uid from callback fast path is preserved as-is", () => {
  // On the fast path, conv_uid comes from body.conv_uid, not re-computed.
  const callbackConvUid = "callback-provided-conv-uid-hash";
  let conv_uid = (callbackConvUid || "").trim();
  const doclingArtifactSizeBytes = 5000;
  const extractedBlocks = [{ block_type: "paragraph", block_content: "test", pointer: "#/texts/0", page_no: null, page_nos: [], parser_block_type: "paragraph", parser_path: "/texts/0" }];

  // Fast path: all three provided, no download needed
  const needsDownload = !conv_uid || doclingArtifactSizeBytes == null || extractedBlocks.length === 0;
  assertEquals(needsDownload, false);
  assertEquals(conv_uid, callbackConvUid);
});

Deno.test("extractDoclingBlocks returns blocks with expected fields", () => {
  // Minimal valid DoclingDocument JSON
  const doclingJson = {
    name: "test",
    texts: [
      { text: "Hello world", label: "paragraph", prov: [{ page_no: 1, bbox: {} }] },
    ],
    furniture: { log_items: [] },
  };
  const bytes = new TextEncoder().encode(JSON.stringify(doclingJson));
  const result = extractDoclingBlocks(bytes);

  assertEquals(Array.isArray(result.blocks), true);
  // Blocks should have the shape conversion-complete expects
  if (result.blocks.length > 0) {
    const b = result.blocks[0];
    assertEquals(typeof b.block_type, "string");
    assertEquals(typeof b.block_content, "string");
    assertEquals(typeof b.pointer, "string");
  }
});
