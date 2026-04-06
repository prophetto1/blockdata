# Plan Tracker Backend Takeover Considerations

## Purpose

This note is for a new frontend developer redesigning `/app/superuser/plan-tracker` from scratch without prior project context.

The key truth is simple:

- Plan Tracker does **not** currently have a backend service.
- The page is a browser-local frontend over local Markdown files.
- The real coupling is to the browser file-system layer, frontmatter metadata contract, and workflow file-write semantics.

## Current System Reality

### There is no plan-tracker backend today

The approved refoundation plan explicitly locked this work to **browser-local only**:

- no new FastAPI route modules
- no modified FastAPI route modules
- no new edge functions
- no modified edge functions
- no platform API dependency
- no database dependency

Primary source:

- `E:\writing-system\docs\plans\dev-only\plan-tracker\2026-04-04-plan-tracker-workspace-refoundation-implementation-plan.md`

Relevant statements:

- line 5: keep the feature entirely browser-local inside `web`
- line 38: no current requirement introduces platform API, database, edge-function, or shared backend runtime changes
- line 46: the refoundation reads and writes local Markdown files through the File System Access API only
- line 403: no backend API, database, or edge-function changes are required

Repo verification:

- `services/platform-api` contains no `plan-tracker` implementation surface

## What The Frontend Is Actually Coupled To

### 1. File System Access API is the real persistence layer

The route does not fetch from a server. It opens a local directory, reads files recursively, and writes files back to disk.

Key files:

- `E:\writing-system\web\src\lib\fs-access.ts`
- `E:\writing-system\web\src\pages\superuser\usePlanTracker.tsx`

Important implementation facts:

- `fs-access.ts:254-257` uses `showDirectoryPicker({ mode: 'readwrite' })`
- `fs-access.ts:33` reads directories recursively
- `fs-access.ts:79` reads file contents
- `fs-access.ts:84` writes file contents
- `fs-access.ts:204` creates sibling files
- `usePlanTracker.tsx:297-298` picks and persists the directory handle
- `usePlanTracker.tsx:238` loads the selected directory tree
- `usePlanTracker.tsx:622` writes the current document back to disk
- `usePlanTracker.tsx:454`, `usePlanTracker.tsx:548` create new sibling artifact files

Implication for a redesign:

- the page is only usable in environments that support the File System Access API
- there is no server fallback
- any redesign that assumes normal REST fetch/save semantics is solving a different product

### 2. IndexedDB stores the directory handle session

The selected directory handle is restored from IndexedDB, not from a backend session.

Key file:

- `E:\writing-system\web\src\lib\fs-access.ts`

Important implementation facts:

- `fs-access.ts:262-264` uses IndexedDB database `superuser-workspace`, store `handles`, default key `selectedDir`
- `usePlanTracker.tsx:136` uses store key `plan-tracker-dir`
- `usePlanTracker.tsx:273` restores the saved directory handle on load

Implication for a redesign:

- changing the store key or handle-restore flow changes the user's reopen behavior
- there is no remote session or server-owned workspace state

### 3. Markdown + YAML frontmatter is the real data model

There is no backend schema enforcing plan metadata. The schema lives in frontend TypeScript and is serialized into file frontmatter.

Key file:

- `E:\writing-system\web\src\pages\superuser\planTrackerModel.ts`

Important implementation facts:

- `planTrackerModel.ts:3-17` defines the locked lifecycle states
- `planTrackerModel.ts:19-43` defines the metadata contract
- `planTrackerModel.ts:75-83` defines workflow action IDs
- `planTrackerModel.ts:339-374` parses frontmatter into normalized metadata
- `planTrackerModel.ts:400-413` serializes normalized metadata back out

Current metadata fields include:

- `title`
- `description`
- `planId`
- `artifactType`
- `status`
- `version`
- `createdAt`
- `updatedAt`
- `productArea`
- `functionalArea`
- `productL1`
- `productL2`
- `productL3`
- `priority`
- `owner`
- `reviewer`
- `trackerId`
- `tags`
- `supersedesArtifactId`
- `relatedArtifacts`
- `notes`

Implication for a redesign:

- if the UI changes, the metadata contract still matters
- changing field names or meanings is not a pure frontend redesign; it changes the storage contract
- tags, ownership, lifecycle state, and classification are file metadata, not backend records

### 4. Directory shape is not the product model

The visible tracker UI is supposed to be metadata-derived, even though the write target is the real file tree.

Locked plan source:

- `E:\writing-system\docs\plans\dev-only\plan-tracker\2026-04-04-plan-tracker-workspace-refoundation-implementation-plan.md`

Locked storage/view rules:

- `docs/plans/**` remains the storage layer and write target
- visible grouping must be metadata-driven
- explicit tracker metadata is the source of truth when present
- filename heuristics are only a legacy fallback
- selecting any artifact must still resolve to a real file on disk

Implication for a redesign:

- a new UI may radically change the layout
- it should not turn the route into a raw file browser unless the product contract is intentionally changed

## Workflow And Write Semantics The New Dev Must Understand

### 5. Workflow actions are file-writing operations, not backend mutations

Workflow transitions do not call APIs. They update the controlling plan artifact and may create sibling Markdown artifacts.

Key files:

- `E:\writing-system\web\src\pages\superuser\planTrackerModel.ts`
- `E:\writing-system\web\src\pages\superuser\usePlanTracker.tsx`

Important implementation facts:

- `planTrackerModel.ts:571-600` determines allowed actions by lifecycle state
- `planTrackerModel.ts:602-680` maps actions to artifact type, status, and generated titles
- `usePlanTracker.tsx:488-583` executes workflow actions
- `usePlanTracker.tsx:477` and `usePlanTracker.tsx:571` write newly generated note/workflow artifacts

Current lifecycle states:

- `to-do`
- `in-progress`
- `under-review`
- `approved`
- `implemented`
- `verified`
- `closed`

Current action set:

- `start-work`
- `submit-for-review`
- `send-back`
- `approve`
- `mark-implementing`
- `mark-implemented`
- `request-verification`
- `close`

Implication for a redesign:

- the right rail and action UX can change completely
- the workflow matrix cannot be ignored unless the product contract is being changed on purpose

### 6. Dirty-state gating is part of the behavior contract

Before a workflow action runs, the tracker is supposed to resolve dirty state with `Save`, `Discard`, or `Cancel`.

Key file:

- `E:\writing-system\web\src\pages\superuser\usePlanTracker.tsx`

Important implementation facts:

- `usePlanTracker.tsx:82-87` defines pending-action resolution types
- `usePlanTracker.tsx:589-608` requests a workflow action
- `usePlanTracker.tsx:630-681` resolves `save`, `discard`, or `cancel`

Implication for a redesign:

- this is not just visual chrome
- if the rewrite changes document orchestration, this behavior must still be preserved or explicitly replaced

### 7. Current write safety is a temporary frontend guard, not a complete revision system

The current implementation now blocks direct saves on canonical `plan` artifacts and shows a message telling the user to create a new revision instead.

Key files:

- `E:\writing-system\web\src\pages\superuser\usePlanTracker.tsx`
- `E:\writing-system\web\src\pages\superuser\PlanDocumentPane.tsx`

Important implementation facts:

- `usePlanTracker.tsx:610-618` blocks `plan` artifact saves with `Canonical plan artifacts are read-only. Create a new revision instead.`
- `PlanDocumentPane.tsx:59-60` treats `plan` artifacts as non-editable
- `PlanDocumentPane.tsx:132` mounts the editor in read-only mode for those artifacts

Important warning:

- there is **not yet** a real `Create Revision` implementation creating `plan v2`
- so this is a safety brake, not a finished versioning system

Implication for a redesign:

- a new frontend owner must not assume revision lineage already exists
- if they want editable canonical plans again, that is a product and safety decision, not a styling change

## What Is Safe To Redesign Freely

These are mostly frontend concerns and can be replaced without backend coordination, as long as the storage contract above remains intact:

- left / center / right layout
- pane sizing and hierarchy
- navigator presentation
- inspector composition
- document surface visuals
- action placement
- metadata density
- empty states
- visual language

## What Is Not “Just Frontend”

If the new developer wants any of the following, they are no longer doing only a frontend redesign:

- collaborative multi-user editing
- remote persistence
- server-side search or indexing
- auth-gated access control for plan data
- audit logs
- optimistic concurrency / merge conflict handling
- branch-aware persistence
- shared comments or threaded review history
- background jobs or notifications
- durable workflow history outside Markdown artifacts

Those would require new backend/API/database decisions that do not exist today.

## Recommended Mental Model For The New Frontend Owner

Treat Plan Tracker as:

- a specialized local workspace
- over real repo files
- with a metadata model encoded in YAML frontmatter
- and workflow transitions expressed as deterministic sibling Markdown writes

Do **not** treat it as:

- a normal CRUD app backed by a server
- a database-admin panel
- a collaborative SaaS workflow surface

## Practical Takeover Checklist

Before redesigning, the new frontend developer should verify:

1. They understand that the system of record is local Markdown on disk, not an API response.
2. They can trace directory pick, handle restore, file read, file write, and file creation through `fs-access.ts`.
3. They can trace metadata parsing and serialization through `planTrackerModel.ts`.
4. They can trace workflow action side effects through `usePlanTracker.tsx`.
5. They understand that current plan-artifact read-only behavior is a temporary safety guard, not finished revisioning.
6. They know that any move to true revisions, collaboration, or shared persistence is a backend expansion project.

## Bottom Line

The backend considerations are mostly about understanding that there is effectively **no backend** today.

The real takeover surface is:

- browser capabilities
- IndexedDB handle restore
- local file IO
- YAML frontmatter schema
- lifecycle normalization
- workflow artifact creation
- write safety and revision semantics

That is what the next frontend owner has to preserve, replace deliberately, or escalate into a new backend project.
