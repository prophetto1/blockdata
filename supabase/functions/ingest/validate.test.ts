import {
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { checkIdempotency } from "./validate.ts";

type ExistingDocRow = {
  source_uid: string;
  owner_id: string;
  conv_uid: string | null;
  status: string | null;
  error: string | null;
  project_id: string | null;
};

function makeSupabaseForExistingDoc(existing: ExistingDocRow | null) {
  return {
    from(table: string) {
      if (table !== "documents_v2") {
        throw new Error(`Unexpected table access in test: ${table}`);
      }
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        async maybeSingle() {
          return { data: existing, error: null };
        },
      };
    },
  };
}

Deno.test("checkIdempotency returns existing doc when same project uploads identical file", async () => {
  const existing: ExistingDocRow = {
    source_uid: "abc123",
    owner_id: "owner-1",
    conv_uid: "conv-1",
    status: "ingested",
    error: null,
    project_id: "project-a",
  };
  const supabaseAdmin = makeSupabaseForExistingDoc(existing);

  const result = await checkIdempotency(
    supabaseAdmin as never,
    "abc123",
    "owner-1",
  );

  assertEquals(result, {
    action: "return_existing",
    response: {
      source_uid: "abc123",
      conv_uid: "conv-1",
      status: "ingested",
      error: undefined,
    },
  });
});

Deno.test("checkIdempotency returns existing doc when different project uploads identical file", async () => {
  const existing: ExistingDocRow = {
    source_uid: "abc123",
    owner_id: "owner-1",
    conv_uid: "conv-1",
    status: "ingested",
    error: null,
    project_id: "project-a",
  };
  const supabaseAdmin = makeSupabaseForExistingDoc(existing);

  // Cross-project re-upload of identical bytes returns existing doc (no 409).
  // Spec acknowledges global PK as known risk; cross-project policy is unspecified.
  const result = await checkIdempotency(
    supabaseAdmin as never,
    "abc123",
    "owner-1",
  );

  assertEquals(result, {
    action: "return_existing",
    response: {
      source_uid: "abc123",
      conv_uid: "conv-1",
      status: "ingested",
      error: undefined,
    },
  });
});
