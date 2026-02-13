import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { extractPandocBlocks } from "./pandoc.ts";

const encoder = new TextEncoder();

Deno.test("extractPandocBlocks maps Header and Para", () => {
  const ast = {
    "pandoc-api-version": [1, 23],
    meta: {},
    blocks: [
      { t: "Header", c: [1, ["", [], []], [{ t: "Str", c: "Title" }]] },
      { t: "Para", c: [{ t: "Str", c: "Hello" }, { t: "Space" }, { t: "Str", c: "world" }] },
    ],
  };

  const result = extractPandocBlocks(encoder.encode(JSON.stringify(ast)));
  assertEquals(result.blocks.length, 2);
  assertEquals(result.blocks[0].block_type, "heading");
  assertEquals(result.blocks[0].path, "$.blocks[0]");
  assertEquals(result.blocks[1].block_type, "paragraph");
});

Deno.test("extractPandocBlocks maps list items as list_item blocks", () => {
  const ast = {
    "pandoc-api-version": [1, 23],
    meta: {},
    blocks: [
      {
        t: "BulletList",
        c: [
          [
            { t: "Plain", c: [{ t: "Str", c: "One" }] },
          ],
          [
            { t: "Plain", c: [{ t: "Str", c: "Two" }] },
          ],
        ],
      },
    ],
  };
  const result = extractPandocBlocks(encoder.encode(JSON.stringify(ast)));
  assertEquals(result.blocks.length, 2);
  assertEquals(result.blocks[0].block_type, "list_item");
  assertEquals(result.blocks[1].block_type, "list_item");
});

Deno.test("extractPandocBlocks maps unknown constructors to other", () => {
  const ast = {
    "pandoc-api-version": [1, 23],
    meta: {},
    blocks: [
      { t: "Mystery", c: ["x"] },
    ],
  };
  const result = extractPandocBlocks(encoder.encode(JSON.stringify(ast)));
  assertEquals(result.blocks.length, 1);
  assertEquals(result.blocks[0].block_type, "other");
});
