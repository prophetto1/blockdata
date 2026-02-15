import {
  assertEquals,
  assertGreaterOrEqual,
  assertLessOrEqual,
  assertMatch,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  DOC_STATUS_EXECUTION_ORDER,
  computeStepDurationsMs,
  buildPreviewManifest,
  buildChunksFromPartitionElements,
  buildDeterministicChunkEmbeddings,
  parsePositiveIntEnv,
  buildRunDocStatusUpdateBody,
  buildPartitionServiceRequest,
  buildFallbackPartitionElements,
  buildTrackBArtifactKey,
  buildTrackBIds,
  coercePartitionElements,
  deriveRunTerminalStatus,
  handleTrackBWorkerRequest,
  parseWorkerPayload,
  resolvePlatformBlockType,
} from "./index.ts";

Deno.test("deriveRunTerminalStatus derives success/partial/failed", () => {
  assertEquals(
    deriveRunTerminalStatus({ successCount: 3, failedCount: 0 }),
    "success",
  );
  assertEquals(
    deriveRunTerminalStatus({ successCount: 2, failedCount: 1 }),
    "partial_success",
  );
  assertEquals(
    deriveRunTerminalStatus({ successCount: 0, failedCount: 2 }),
    "failed",
  );
});

Deno.test("DOC_STATUS_EXECUTION_ORDER keeps persisting after enriching", () => {
  assertEquals(DOC_STATUS_EXECUTION_ORDER, [
    "indexing",
    "downloading",
    "partitioning",
    "chunking",
    "enriching",
    "persisting",
  ]);
});

Deno.test("buildTrackBArtifactKey includes workspace scope and run/doc path", () => {
  const key = buildTrackBArtifactKey({
    workspace_id: "11111111-1111-1111-1111-111111111111",
    run_uid: "22222222-2222-2222-2222-222222222222",
    source_uid:
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    filename: "partition.json",
  });
  assertEquals(
    key,
    "workspace_b/11111111-1111-1111-1111-111111111111/track_b/runs/22222222-2222-2222-2222-222222222222/0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef/partition.json",
  );
});

Deno.test("buildTrackBIds is deterministic and namespaced", async () => {
  const run_uid = "22222222-2222-2222-2222-222222222222";
  const source_uid =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const a = await buildTrackBIds({ run_uid, source_uid, element_ordinal: 0 });
  const b = await buildTrackBIds({ run_uid, source_uid, element_ordinal: 0 });
  assertEquals(a, b);
  assertEquals(a.canonical_doc_uid, source_uid);
  assertEquals(a.canonical_block_uid, `${source_uid}:0`);
  assertMatch(a.u_doc_uid, /^[0-9a-f]{64}$/);
  assertMatch(a.u_block_uid, /^[0-9a-f]{64}$/);
});

Deno.test("parseWorkerPayload applies defaults and bounds batch_size", () => {
  assertEquals(parseWorkerPayload({}).batch_size, 1);
  assertEquals(parseWorkerPayload({ batch_size: 0 }).batch_size, 1);
  assertEquals(parseWorkerPayload({ batch_size: 999 }).batch_size, 20);
  assertEquals(parseWorkerPayload({ batch_size: 4 }).batch_size, 4);
});

Deno.test("resolvePlatformBlockType returns mapped value and fallback", () => {
  const mapped = resolvePlatformBlockType({
    raw_element_type: "NarrativeText",
    mapping: new Map<string, string>([
      ["NarrativeText", "paragraph"],
      ["Title", "heading"],
    ]),
    fallback: "other",
  });
  assertEquals(mapped.platform_block_type, "paragraph");
  assertEquals(mapped.used_fallback, false);

  const fallback = resolvePlatformBlockType({
    raw_element_type: "UnknownType",
    mapping: new Map<string, string>([
      ["NarrativeText", "paragraph"],
    ]),
    fallback: "other",
  });
  assertEquals(fallback.platform_block_type, "other");
  assertEquals(fallback.used_fallback, true);
});

Deno.test("buildFallbackPartitionElements returns title + paragraph when title exists", () => {
  const out = buildFallbackPartitionElements({
    source_uid:
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    doc_title: "Sample Title",
  });
  assertEquals(out.length, 2);
  assertEquals(out[0].raw_element_type, "Title");
  assertEquals(out[0].text, "Sample Title");
  assertEquals(out[1].raw_element_type, "NarrativeText");
});

Deno.test("coercePartitionElements falls back on invalid payload", () => {
  const fallback = buildFallbackPartitionElements({
    source_uid:
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    doc_title: "Sample Title",
  });
  const out = coercePartitionElements({ nope: true }, fallback);
  assertEquals(out, fallback);
});

Deno.test("coercePartitionElements parses unstructured-style element payload", () => {
  const fallback = buildFallbackPartitionElements({
    source_uid:
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    doc_title: "Sample Title",
  });
  const out = coercePartitionElements(
    {
      elements: [
        {
          type: "Title",
          element_id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          text: "Sample Title",
          metadata: {
            page_number: 1,
            coordinates: {
              points: [
                [0, 0],
                [10, 0],
                [10, 10],
                [0, 10],
              ],
              system: "PixelSpace",
              layout_width: 1000,
              layout_height: 1000,
            },
          },
        },
      ],
    },
    fallback,
  );
  assertEquals(out.length, 1);
  assertEquals(out[0].raw_element_type, "Title");
  assertEquals(out[0].raw_element_id, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  assertEquals(out[0].page_number, 1);
  assertEquals(out[0].coordinates_json?.system, "PixelSpace");
  assertEquals(out[0].raw_payload.type, "Title");
});

Deno.test("coercePartitionElements parses top-level array payload from general endpoint", () => {
  const fallback = buildFallbackPartitionElements({
    source_uid:
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    doc_title: "Sample Title",
  });
  const out = coercePartitionElements(
    [
      {
        type: "NarrativeText",
        element_id: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        text: "From general endpoint",
        metadata: { page_number: 2 },
      },
    ],
    fallback,
  );
  assertEquals(out.length, 1);
  assertEquals(out[0].raw_element_type, "NarrativeText");
  assertEquals(out[0].page_number, 2);
});

Deno.test("coercePartitionElements ignores legacy ad-hoc element fields", () => {
  const fallback = buildFallbackPartitionElements({
    source_uid:
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    doc_title: "Sample Title",
  });
  const out = coercePartitionElements(
    {
      elements: [
        {
          raw_element_type: "Title",
          raw_element_id: "legacy",
          text: "Legacy Title",
          metadata_json: {},
        },
      ],
    },
    fallback,
  );
  assertEquals(out, fallback);
});

Deno.test("buildPartitionServiceRequest uses locked partition parameter contract", () => {
  const request = buildPartitionServiceRequest({
    source_uid:
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    source_type: "pdf",
    source_locator: "uploads/doc.pdf",
    doc_title: "Sample Title",
  });
  assertEquals(request.partition_parameters.coordinates, true);
  assertEquals(request.partition_parameters.strategy, "auto");
  assertEquals(request.partition_parameters.output_format, "application/json");
  assertEquals(request.partition_parameters.unique_element_ids, false);
  assertEquals(request.partition_parameters.chunking_strategy, "by_title");
});

Deno.test("buildChunksFromPartitionElements chunks text in source order", () => {
  const chunks = buildChunksFromPartitionElements(
    [
      {
        raw_element_type: "Title",
        text: "Alpha",
        raw_element_id: "a",
        page_number: 1,
        metadata_json: {},
        coordinates_json: null,
        raw_payload: { type: "Title", text: "Alpha" },
      },
      {
        raw_element_type: "NarrativeText",
        text: "Beta Gamma",
        raw_element_id: "b",
        page_number: 1,
        metadata_json: {},
        coordinates_json: null,
        raw_payload: { type: "NarrativeText", text: "Beta Gamma" },
      },
      {
        raw_element_type: "NarrativeText",
        text: "Delta Epsilon",
        raw_element_id: "c",
        page_number: 1,
        metadata_json: {},
        coordinates_json: null,
        raw_payload: { type: "NarrativeText", text: "Delta Epsilon" },
      },
    ],
    16,
  );
  assertEquals(chunks.length, 3);
  assertEquals(chunks[0].source_element_ordinals, [0]);
  assertEquals(chunks[1].source_element_ordinals, [1]);
  assertEquals(chunks[2].source_element_ordinals, [2]);
});

Deno.test("buildDeterministicChunkEmbeddings is stable and bounded", () => {
  const vectorsA = buildDeterministicChunkEmbeddings([
    { chunk_ordinal: 0, text: "Alpha", source_element_ordinals: [0] },
  ]);
  const vectorsB = buildDeterministicChunkEmbeddings([
    { chunk_ordinal: 0, text: "Alpha", source_element_ordinals: [0] },
  ]);
  assertEquals(vectorsA, vectorsB);
  assertEquals(vectorsA[0].vector.length, 8);
  for (const v of vectorsA[0].vector) {
    assertGreaterOrEqual(v, -1);
    assertLessOrEqual(v, 1);
  }
});

Deno.test("buildRunDocStatusUpdateBody sets step timestamps for chunk and embed", () => {
  const now = "2026-02-15T01:23:45.000Z";
  const chunking = buildRunDocStatusUpdateBody("chunking", now);
  assertEquals(chunking.step_chunked_at, now);

  const enriching = buildRunDocStatusUpdateBody("enriching", now);
  assertEquals(enriching.step_embedded_at, now);

  const persisting = buildRunDocStatusUpdateBody("persisting", now, "boom");
  assertEquals(persisting.step_uploaded_at, now);
  assertEquals(persisting.error, "boom");
});

Deno.test("computeStepDurationsMs returns stage deltas", () => {
  const marks = {
    indexing: "2026-02-15T00:00:00.000Z",
    downloading: "2026-02-15T00:00:01.000Z",
    partitioning: "2026-02-15T00:00:03.000Z",
    chunking: "2026-02-15T00:00:06.000Z",
    enriching: "2026-02-15T00:00:08.000Z",
    persisting: "2026-02-15T00:00:09.000Z",
    success: "2026-02-15T00:00:11.000Z",
  };
  const out = computeStepDurationsMs(marks);
  assertEquals(out.indexing_ms, 1000);
  assertEquals(out.downloading_ms, 2000);
  assertEquals(out.partitioning_ms, 3000);
  assertEquals(out.chunking_ms, 2000);
  assertEquals(out.enriching_ms, 1000);
  assertEquals(out.persisting_ms, 2000);
});

Deno.test("parsePositiveIntEnv enforces bounds and fallback", () => {
  assertEquals(parsePositiveIntEnv(undefined, 1200, 200, 8000), 1200);
  assertEquals(parsePositiveIntEnv("abc", 1200, 200, 8000), 1200);
  assertEquals(parsePositiveIntEnv("100", 1200, 200, 8000), 200);
  assertEquals(parsePositiveIntEnv("9000", 1200, 200, 8000), 8000);
  assertEquals(parsePositiveIntEnv("512", 1200, 200, 8000), 512);
});

Deno.test("buildPreviewManifest marks pdf sources as ready", () => {
  const out = buildPreviewManifest({
    source_type: "pdf",
    source_locator: "uploads/a.pdf",
  });
  assertEquals(out.status, "ready");
  assertEquals(out.preview_type, "source_pdf");
});

Deno.test("buildPreviewManifest marks non-pdf sources as unavailable", () => {
  const out = buildPreviewManifest({
    source_type: "docx",
    source_locator: "uploads/a.docx",
  });
  assertEquals(out.status, "unavailable");
  assertEquals(out.preview_type, "none");
});

Deno.test("handleTrackBWorkerRequest rejects unauthorized worker key", async () => {
  const req = new Request("https://example.com/functions/v1/track-b-worker", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Track-B-Worker-Key": "wrong",
    },
    body: JSON.stringify({ batch_size: 1 }),
  });
  const resp = await handleTrackBWorkerRequest(req, {
    requireEnv: () => "expected",
    createAdminClient: (() => ({})) as never,
  });
  const body = await resp.json();
  assertEquals(resp.status, 401);
  assertEquals(body.error, "Unauthorized");
});

Deno.test("handleTrackBWorkerRequest rejects non-POST methods", async () => {
  const req = new Request("https://example.com/functions/v1/track-b-worker", {
    method: "GET",
  });
  const resp = await handleTrackBWorkerRequest(req, {
    requireEnv: () => "expected",
    createAdminClient: (() => ({})) as never,
  });
  const body = await resp.json();
  assertEquals(resp.status, 405);
  assertEquals(body.error, "Method not allowed");
});
