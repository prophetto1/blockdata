# Duplicate source_uid Handling

## Problem

When a user uploads a file, `source_uid = SHA256(source_type + "\n" + raw_source_bytes)`. Identical file content produces identical `source_uid`. If a user uploads the same file twice, what happens?

- Uploading duplicate bytes wastes bandwidth
- Inserting duplicate `source_uid` violates PK constraint
- User expects to see "their document" regardless of when they uploaded it

## Proposed Methodology

```
User drops file
       ↓
Compute source_uid client-side (SHA256 in browser)
       ↓
   API call: GET /documents?source_uid={hash}
       ↓
   ┌─────────────────────────────────────┐
   │  Exists?                            │
   ├─────────────────────────────────────┤
   │  Yes → Navigate to /document/{doc_uid}  │  ← No upload, instant
   │  No  → Upload file → Ingest → Navigate  │  ← Normal flow
   └─────────────────────────────────────┘
```

**Behavior:**

- Hash computed client-side _before_ uploading
- If `source_uid` exists for the current user, file never leaves browser — redirect to existing document
- If new, proceed with upload and ingest
- User sees their document either way (no "already exists" message)

## Important Note (Multi-user constraint)

With the current database schema (`documents.source_uid` is a global primary key) and RLS (`documents.owner_id = auth.uid()`),
two different users cannot upload identical bytes without a schema change (e.g., a per-owner “document instances” table).
