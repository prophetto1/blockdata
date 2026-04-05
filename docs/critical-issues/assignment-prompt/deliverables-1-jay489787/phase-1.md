Design Output / Deliverables Plan
Phase 1 — Contract extraction and reuse audit

Lock the visual/frontend contract from the approved plan, identify the exact persistent pane scaffolds, inventory existing tokens/components/primitives to reuse, and define the state-to-visibility behavior.

Phase 2 — Persistent scaffold / placeholder-mode composition

Modify the tracker route and pane rendering so the left navigator, center document workspace, and right inspector are all visibly mounted on first load, with placeholder/disabled content inside the real structure.

Phase 3 — Component-level refinement and interaction framing

Refine the actual pane chrome: document header, mode controls, metadata rows, tag chips, workflow grouping, and empty-state placement so the page reads unmistakably as a plan tracker before live data fills it.

Phase 4 — Visual verification and structural corrections

Capture Playwright screenshots for first load, directory loaded/no selection, selected artifact, dirty document state, and disabled/enabled workflow states; correct any lingering generic-shell behavior.

Phase 5 — Semantic/data wiring

Only if explicitly requested after the structural pass: continue wiring filesystem-derived values and workflow state into the already-visible scaffold, without changing any locked backend/workflow contract.

Phase 1 — Contract extraction and reuse audit
1. Frontend Contract Summary
Page purpose

This page is a browser-local plan tracker workspace. It reads and writes real Markdown files from docs/plans/** through the File System Access API, but it must not present the raw directory tree as the primary product model. Instead, it presents a metadata-derived lifecycle workspace.

Page layout

The approved implementation plan locks a three-column workspace shell:

Left: metadata-driven lifecycle navigator
Center: real document workspace using the existing editor foundation
Right: structured metadata + workflow inspector
Each pane’s role

Left pane

lifecycle tabs in exact order: To Do, In Progress, Under Review, Approved, Implemented, Verified, Closed
one visible row per plan unit
selected plan may reveal nested artifact rows
metadata-driven grouping, never raw tree-first UX

Center pane

active document surface
opens the selected artifact’s real file from disk
supports Markdown/MDX editing plus preview/source/diff through the existing editor foundation
file header must keep the active file legible, including actual filename and unsaved state

Right pane

fixed inspector order:
Summary
Classification
Timeline
Workflow Actions
Notes / Action Composer
Related Artifacts
dirty-action gating is mandatory
comment/note behavior is artifact-backed, not ephemeral inline comment state
Always-visible structures vs conditional content

Always visible on page load

left pane tab strip and navigator shell
center document workspace frame
right inspector frame with all locked section headers
page-level tracker shell and workbench layout

Conditional

selected plan values
selected artifact content
enabled/disabled workflow actions
actual metadata values
dirty/save state tied to a real file

This is the main design correction: pane identity must persist; only inner content changes by state. That is also where the current implementation is still wrong. PlanTracker.tsx correctly mounts the 3-column workbench, but usePlanTracker.tsx still replaces the center and right panes with whole-pane empty states instead of keeping their product scaffolds mounted.

Locked lifecycle states
to-do
in-progress
under-review
approved
implemented
verified
closed
Locked metadata fields

Required phase-1 metadata

title
planId
artifactType
status
version
productL1
productL2
productL3
createdAt
updatedAt

Optional but strongly encouraged

owner
reviewer
tags
supersedesArtifactId
relatedArtifacts
notes
Locked workflow actions
Start Work
Submit for Review
Send Back
Approve
Mark Implementing
Mark Implemented
Request Verification
Close
Current implementation mismatch

The current implementation status report already says the visual shell remained too generic and too empty, even though the route, editor, and local workflow behavior were wired. That diagnosis still matches the actual repo state: the left navigator and right inspector components exist, but the center/right pane scaffolds are still too selection-gated.

2. Reuse Audit
Existing tokens to consume

From tailwind.css

semantic surfaces: bg-card, bg-background, bg-muted, bg-accent
semantic text: text-foreground, text-muted-foreground
semantic borders: border-border
semantic emphasis: text-primary, ring-primary, bg-primary/10
radius is already standardized via --radius and theme-mapped radii
shell spacing and typography scales already exist in CSS variables and Tailwind theme mappings

From color-contract.ts

use card for pane bodies
use background for inner surfaces
use muted for disabled/placeholder chips and support surfaces
use accent for selected/hovered internal sections
use primary only for true state emphasis, not for broad decorative use

From font-contract.ts

text-2xl font-bold only at page-level or major headers
text-sm font-semibold for pane titles / card titles
text-xs font-semibold uppercase tracking-wide text-muted-foreground for section labels
font-mono only for filenames, IDs, technical values, versioned artifact references when needed
default UI typography remains font-sans throughout the tracker shell
Existing shared components/primitives to use
Workbench as the layout shell, reused as-is
MdxEditorSurface as the actual editor, reused as-is
useWorkspaceEditor as the reference pattern for document header + mode toggle + save affordance
useShellHeaderTitle already in use for page identity
ScrollArea already used inside MdxEditorSurface; avoid reinventing scroll containers unless needed
existing button/input/textarea styling patterns should be kept consistent with current shared UI usage rather than custom one-off styling
Existing layout/workbench/editor primitives to use
Workbench.tsx for locked three-column composition
MdxEditorSurface.tsx for real document editing
useWorkspaceEditor.tsx for:
file header pattern
mode-toggle row
save-button placement
editor-frame composition
current PlanStateNavigator.tsx as the structural base for the left pane
current PlanMetadataPane.tsx as the structural base for the right pane
What must not be reinvented
do not replace Workbench
do not replace MdxEditorSurface
do not create a custom raw HTML/CSS editor shell when useWorkspaceEditor already demonstrates the correct contract
do not invent a new visual token palette
do not reintroduce a raw file-tree-primary UX
do not turn the right pane into a giant arbitrary metadata form
Genuinely new components needed

Only one genuinely new component is justified in this pass:

PlanDocumentPane.tsx
Purpose: persistent center-pane scaffold that always renders:

document header row
filename / unsaved placeholder row
mode controls
editor frame or placeholder editor shell
empty-state message inside the frame, not instead of the frame

Justification: the current gating problem lives in usePlanTracker.tsx render logic, which swaps the whole pane out for “No artifact selected.” The center needs its own stable product scaffold rather than relying on the editor surface alone.

Optional small helper, only if needed for cleanliness:

PlanMetadataPanePlaceholder.tsx or a built-in placeholder mode inside PlanMetadataPane.tsx
Purpose: render the right inspector in unselected mode with disabled/placeholder values while keeping the real section order visible.

3. Structural UI Contract (pane by pane)
Left pane — Lifecycle navigator
Must always be visible on page load
pane title: “Plans”
short sublabel: “Lifecycle-driven tracker view”
all lifecycle tabs in locked order
tab count slots, even if placeholder
row region for plan units
empty-state copy inside the navigator body if nothing is loaded
Placeholder until selection/data
counts can be — or skeleton chips before load
plan rows can be skeleton rows before directory load
if directory chosen but active tab empty, show “No plans in X” inside the navigator body
Becomes live later
actual counts
plan-unit rows
nested artifact rows
selected row state
artifact chips / dates / version numbers
Must never disappear / become generic
lifecycle tabs
navigator header
row structure zone
selected-plan expansion region

Current mismatch: good component exists, but it only appears when planUnits.length > 0; otherwise the whole pane becomes a generic centered “Open Plans Directory” state. The action can remain, but the navigator skeleton must still remain visible.

Center pane — Document workspace
Must always be visible on page load
pane header bar
file name/status row
unsaved indicator slot
save button slot
mode toggle group (Edit / Preview / Source / Diff) or the subset actually supported by the mounted surface
editor canvas/frame area
Placeholder until selection/data
filename placeholder like “No artifact selected”
disabled save button
disabled mode controls
empty-state copy inside editor frame:
no directory selected
directory loaded but no plan selected
plan selected but no artifact selected (if that ever occurs)
Becomes live later
actual filename
dirty state
real mode switching
mounted MdxEditorSurface
source/diff/preview content
Must never disappear / become generic
header row
mode controls row
editor frame/canvas
document-workspace visual identity

Current mismatch: usePlanTracker.tsx returns a bare “No artifact selected.” block instead of a persistent document product scaffold. That is the clearest structural defect in the current implementation.

Right pane — Metadata/workflow inspector
Must always be visible on page load
pane title: “Inspector”
sublabel
all six locked sections:
Summary
Classification
Timeline
Workflow Actions
Notes / Action Composer
Related Artifacts
Placeholder until selection/data
placeholder rows for:
title
planId
artifactType
status
version
productL1 / productL2 / productL3
createdAt / updatedAt
owner / reviewer
tags
notes
disabled workflow buttons in a visible action stack
disabled note title input / textarea / create button
placeholder chips for tags / artifact type / state
placeholder lineage/related artifacts rows
Becomes live later
actual metadata values
enabled/disabled actions based on lifecycle
dirty-gate messaging
note creation handler
real related artifact links
Must never disappear / become generic
the inspector frame
the section headers
the metadata row scaffolding
the workflow area
the note composer area

Current mismatch: PlanMetadataPane.tsx itself is structurally strong, but usePlanTracker.tsx only mounts it when both selectedPlan and selectedArtifact exist; otherwise the whole pane is replaced with “No metadata available.” That must change.

4. State-to-Visibility Matrix
State	Left pane	Center pane	Right pane
No directory selected	Tabs visible, placeholder counts, placeholder/skeleton rows, inline “Open Plans Directory” CTA in navigator body	Document header visible, filename placeholder, disabled mode controls, disabled save slot, empty editor frame with onboarding copy	All six sections visible, placeholder rows, disabled workflow buttons, disabled note composer
Directory selected, no plan selected	Tabs visible, real counts if available, real rows if available, no selected row	Document frame still visible, placeholder filename/status, disabled save, empty editor frame saying select a plan/artifact	Inspector still visible, placeholder values, disabled actions, disabled composer
Plan selected, default artifact selected	Selected plan highlighted, nested artifact rows expanded, artifact list visible	Real filename, real content mounted, save affordance present, mode controls active	Real metadata values, action availability computed, composer active/inactive as appropriate
Artifact selected (within selected plan)	Same selected plan remains highlighted, selected artifact row emphasized	Real selected artifact content visible	Real artifact metadata visible
Dirty document state	No structural change; selection stable	Unsaved indicator visible, save affordance active	Dirty-action messaging visible in workflow area
Workflow actions unavailable	No structural change	No structural change	Action section still visible, buttons disabled or empty-state explanation shown inside section
Workflow actions available	No structural change	No structural change	Only valid actions enabled for current lifecycle state
Active tab has no plans	Tabs visible, body says “No plans in X”	Existing center scaffold unchanged	Existing inspector scaffold unchanged

This matrix is the key design rule: selection changes values, not pane existence.

5. Phase 2 Plan
Files to modify
web/src/pages/superuser/PlanTracker.tsx
web/src/pages/superuser/usePlanTracker.tsx
web/src/pages/superuser/PlanMetadataPane.tsx
web/src/pages/superuser/PlanStateNavigator.tsx
New: web/src/pages/superuser/PlanDocumentPane.tsx
Exact sections to materialize
PlanTracker.tsx
add page-level tracker framing above Workbench
include a lightweight page intro strip:
title
one-line description
maybe directory status chip placeholder
keep Workbench as-is; do not replace it
PlanDocumentPane.tsx (new)
persistent document header
file name/status slot
save slot
mode controls strip
editor frame body
conditional inner rendering:
placeholder onboarding
placeholder “select a plan/artifact”
real MdxEditorSurface
PlanMetadataPane.tsx
add explicit placeholder mode
render owner / reviewer / tags / notes scaffold
render disabled workflow button stack even without selection
preserve section order exactly
PlanStateNavigator.tsx
support placeholder mode when no real plan units yet
keep tabs and row skeletons visible regardless of load state
inline CTA for opening directory should live inside body, not replace the navigator structure
usePlanTracker.tsx
stop returning whole-pane generic empty states
instead:
always mount PlanDocumentPane
always mount PlanMetadataPane
pass selected artifact / selected plan as nullable props or explicit placeholder state flags
left pane should always mount navigator structure even before data is loaded
Expected placeholder-mode output

After Phase 2, a first-time viewer landing on /app/superuser/plan-tracker should already see:

a left pane that clearly reads as a state-driven tracker navigator
a center pane that clearly reads as an MDX-backed document workspace
a right pane that clearly reads as a metadata + workflow inspector

Even with no directory selected, the page must no longer look like a generic multi-pane shell. It must look like the final product with placeholder content.