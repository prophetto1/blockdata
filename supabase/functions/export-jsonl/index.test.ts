import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleExportJsonlRequest } from "./index.ts";

type FakeState = {
  conversion: {
    conv_uid: string;
    conv_status: string;
    conv_parsing_tool: string;
    conv_representation_type: string;
    conv_total_blocks: number;
    conv_block_type_freq: Record<string, number>;
    conv_total_characters: number;
    source_uid: string;
  };
  sourceDocument: {
    source_uid: string;
    source_type: string;
    source_filesize: number;
    source_total_characters: number;
    uploaded_at: string;
    status: string;
  };
  blocks: Array<{
    block_uid: string;
    block_type: string;
    block_index: number;
    block_locator: Record<string, unknown>;
    block_content: string;
  }>;
};

function createFakeUserClient(state: FakeState) {
  return {
    from: (table: string) => {
      if (table === "conversion_parsing") {
        return {
          select: () => ({
            eq: (_column: string, value: string) => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: state.conversion.conv_uid === value ? state.conversion : null,
                  error: null,
                }),
            }),
          }),
        };
      }

      if (table === "source_documents") {
        return {
          select: () => ({
            eq: (_column: string, value: string) => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: state.sourceDocument.source_uid === value ? state.sourceDocument : null,
                  error: null,
                }),
            }),
          }),
        };
      }

      if (table === "blocks") {
        return {
          select: () => ({
            eq: (_column: string, value: string) => ({
              order: () =>
                Promise.resolve({
                  data: state.conversion.conv_uid === value ? state.blocks : [],
                  error: null,
                }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

function parseFirstJsonlRecord(body: string): Record<string, unknown> {
  const firstLine = body.trim().split("\n")[0];
  return JSON.parse(firstLine) as Record<string, unknown>;
}

Deno.test("handleExportJsonlRequest defaults to the admin raw_docling policy when block_view is omitted", async () => {
  const state: FakeState = {
    conversion: {
      conv_uid: "conv-1",
      conv_status: "complete",
      conv_parsing_tool: "docling",
      conv_representation_type: "doclingdocument_json",
      conv_total_blocks: 1,
      conv_block_type_freq: { heading: 1 },
      conv_total_characters: 128,
      source_uid: "source-1",
    },
    sourceDocument: {
      source_uid: "source-1",
      source_type: "pdf",
      source_filesize: 2048,
      source_total_characters: 128,
      uploaded_at: "2026-03-14T00:00:00.000Z",
      status: "parsed",
    },
    blocks: [{
      block_uid: "block-1",
      block_type: "heading",
      block_index: 0,
      block_locator: {
        type: "docling_json_pointer",
        parser_block_type: "title",
        parser_path: "#/texts/0",
      },
      block_content: "Quarterly Review",
    }],
  };

  const req = new Request("https://example.com/functions/v1/export-jsonl?conv_uid=conv-1", {
    method: "GET",
    headers: { Authorization: "Bearer token" },
  });

  const resp = await handleExportJsonlRequest(req, {
    createAdminClient: (() => ({})) as never,
    createUserClient: (() => createFakeUserClient(state)) as never,
    loadAdminPolicyValue: (() => Promise.resolve("raw_docling")) as never,
  });
  const body = await resp.text();
  const record = parseFirstJsonlRecord(body);
  const immutable = record.immutable as Record<string, unknown>;
  const block = immutable.block as Record<string, unknown>;
  const blockLocator = block.block_locator as Record<string, unknown>;

  assertEquals(resp.status, 200);
  assertEquals(block.block_type, "title");
  assertEquals(blockLocator.type, "raw_docling_view");
  assertEquals(blockLocator.parser_path, "#/texts/0");
});

Deno.test("handleExportJsonlRequest treats explicit normalized overrides as raw_docling", async () => {
  const state: FakeState = {
    conversion: {
      conv_uid: "conv-1",
      conv_status: "complete",
      conv_parsing_tool: "docling",
      conv_representation_type: "doclingdocument_json",
      conv_total_blocks: 1,
      conv_block_type_freq: { heading: 1 },
      conv_total_characters: 128,
      source_uid: "source-1",
    },
    sourceDocument: {
      source_uid: "source-1",
      source_type: "pdf",
      source_filesize: 2048,
      source_total_characters: 128,
      uploaded_at: "2026-03-14T00:00:00.000Z",
      status: "parsed",
    },
    blocks: [{
      block_uid: "block-1",
      block_type: "heading",
      block_index: 0,
      block_locator: {
        type: "docling_json_pointer",
        parser_block_type: "title",
        parser_path: "#/texts/0",
      },
      block_content: "Quarterly Review",
    }],
  };

  const req = new Request("https://example.com/functions/v1/export-jsonl?conv_uid=conv-1&block_view=normalized", {
    method: "GET",
    headers: { Authorization: "Bearer token" },
  });

  const resp = await handleExportJsonlRequest(req, {
    createAdminClient: (() => ({})) as never,
    createUserClient: (() => createFakeUserClient(state)) as never,
    loadAdminPolicyValue: (() => Promise.resolve("raw_docling")) as never,
  });
  const body = await resp.text();
  const record = parseFirstJsonlRecord(body);
  const immutable = record.immutable as Record<string, unknown>;
  const block = immutable.block as Record<string, unknown>;
  const blockLocator = block.block_locator as Record<string, unknown>;

  assertEquals(resp.status, 200);
  assertEquals(block.block_type, "title");
  assertEquals(blockLocator.type, "raw_docling_view");
  assertEquals(blockLocator.parser_path, "#/texts/0");
});
