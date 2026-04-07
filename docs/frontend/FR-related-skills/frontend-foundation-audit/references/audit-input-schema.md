# Foundation Audit Input Schema

This is the JSON format the agent must produce as intermediate output before calling the report generator script. The canonical example is at `scripts/fixtures/sample-foundation-audit-input.json`.

## Top-Level Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `repoName` | string | yes | Name of the repository or project being audited |
| `auditDate` | string | no | ISO date string. Defaults to today if omitted. |
| `scope` | object | yes | What was audited and what was excluded |
| `shellOwnership` | array | yes | Shell region inventory |
| `tokenInventory` | array | yes | Token and theme source inventory |
| `componentContracts` | array | yes | Shared component role inventory |
| `pagePatterns` | array | yes | Recurring page-type inventory |
| `navigationStructure` | object | yes | Navigation and rail structure |
| `statePresentation` | object | yes | State-type presentation patterns |
| `accessibilityNotes` | array | no | Cross-cutting accessibility observations. Defaults to empty array. |
| `conflictBundles` | array | yes | Grouped competing patterns requiring discussion |
| `cleanAreas` | array | yes | Audited areas with no conflicts |

## scope

| Field | Type | Required | Description |
|---|---|---|---|
| `repoRoot` | string | yes | Root path or `.` for current directory |
| `capturesReviewed` | string[] | no | Paths to screenshots or capture files used as evidence |
| `tokenFilesReviewed` | string[] | no | Paths to token/theme definition files examined |
| `majorDirectories` | string[] | yes | Directories that were inspected |
| `exclusions` | string[] | no | Directories or files explicitly excluded |
| `surfaceAreaEstimate` | object | yes | Counts for scoping decision |
| `samplingMode` | `"full"` or `"sampled"` | yes | Whether the audit covered everything or used sampling |
| `samplingNotes` | string or null | no | Explanation of what was sampled and why, if sampling mode is `"sampled"` |

### scope.surfaceAreaEstimate

| Field | Type | Required | Description |
|---|---|---|---|
| `shellFiles` | number | yes | Count of shell/layout files found |
| `tokenFiles` | number | yes | Count of token/theme definition files found |
| `sharedComponents` | number | yes | Count of shared UI component files found |
| `pageFiles` | number | yes | Count of page-level component files found |

## shellOwnership[]

Each entry represents one shell region.

| Field | Type | Required | Description |
|---|---|---|---|
| `region` | string | yes | Named shell region (e.g., `"top-header"`, `"left-rail"`, `"content-area"`) |
| `ownerFiles` | string[] | yes | Files that own this region |
| `runtimeRole` | string | yes | What this region does at runtime |
| `stateOwner` | string or null | no | File that owns this region's state, if any |
| `clarityRating` | `"clear"`, `"ambiguous"`, or `"conflicting"` | yes | Whether ownership is unambiguous |
| `notes` | string or null | no | Additional context |
| `evidence` | string[] | yes | File paths, line ranges, or capture references supporting this entry |

## tokenInventory[]

Each entry represents one token/theme source.

| Field | Type | Required | Description |
|---|---|---|---|
| `source` | string | yes | Human-readable name for this token source |
| `files` | string[] | yes | Files that define these tokens |
| `semanticTokensPresent` | boolean | yes | Whether this source uses semantic names |
| `rawValuesPresent` | boolean | yes | Whether this source contains raw hex/pixel/etc. values |
| `lightCoverage` | `"full"`, `"partial"`, or `"none"` | yes | Light mode token coverage |
| `darkCoverage` | `"full"`, `"partial"`, or `"none"` | yes | Dark mode token coverage |
| `driftNotes` | string or null | no | Notes on overlap or conflict with other token sources |
| `evidence` | string[] | yes | File paths, line ranges, or capture references |

## componentContracts[]

Each entry represents one shared component role.

| Field | Type | Required | Description |
|---|---|---|---|
| `role` | string | yes | The UI role this component fills (e.g., `"data-table"`, `"page-header"`) |
| `canonicalCandidates` | string[] | yes | Files that are the strongest candidates for this role |
| `competingImplementations` | string[] | yes | Files that compete for this role. Empty array if none. |
| `ownerFiles` | string[] | yes | Files that own the canonical candidate(s) |
| `usageNotes` | string or null | no | Import frequency, consumer patterns, etc. |
| `visibleStateCoverage` | string[] | yes | Which visible states the canonical candidate handles (e.g., `"default"`, `"loading"`, `"empty"`, `"error"`) |
| `evidence` | string[] | yes | File paths, import counts, or capture references |

## pagePatterns[]

Each entry represents one recurring page type.

| Field | Type | Required | Description |
|---|---|---|---|
| `patternName` | string | yes | Name of the page pattern (e.g., `"registry-list"`, `"detail-workspace"`) |
| `strongestExample` | string | yes | File path of the best existing example |
| `competingExamples` | string[] | yes | File paths of pages that use a different structure for the same pattern. Empty if none. |
| `structureNotes` | string or null | no | How the page is composed |
| `shellAlignmentNotes` | string or null | no | Whether the page aligns with the shell contract |
| `evidence` | string[] | yes | File paths, line ranges, or capture references |

## navigationStructure

| Field | Type | Required | Description |
|---|---|---|---|
| `primaryOwners` | string[] | yes | Files that own the primary navigation |
| `secondaryOwners` | string[] | yes | Files that own secondary navigation. Empty if none. |
| `routeMapping` | string or null | no | Where route definitions live and how they map to surfaces |
| `breadcrumbConventions` | string or null | no | How breadcrumbs work, or that they do not exist |
| `actionPlacement` | string or null | no | Where primary and contextual actions are placed |
| `evidence` | string[] | yes | File paths or capture references |

## statePresentation

| Field | Type | Required | Description |
|---|---|---|---|
| `loading` | string or null | no | Current loading-state approach |
| `empty` | string or null | no | Current empty-state approach |
| `error` | string or null | no | Current error-state approach |
| `success` | string or null | no | Current success-state approach |
| `permission` | string or null | no | Current permission/no-access approach |
| `async` | string or null | no | Current long-running/polling approach |
| `evidence` | string[] | yes | File paths or capture references |

## conflictBundles[]

Each entry groups competing patterns for one role that requires discussion.

| Field | Type | Required | Description |
|---|---|---|---|
| `bundleName` | string | yes | Short identifier for the conflict |
| `roleUnderDispute` | string | yes | What role the competing implementations share |
| `competingImplementations` | array | yes | See sub-schema below |
| `evidence` | string[] | yes | File paths, values, measurements, or capture references |
| `whyNoSingleContract` | string | yes | Why the repo currently lacks one clear winner |
| `recommendedDirection` | string | yes | The auditor's recommended resolution |
| `discussionQuestions` | string[] | yes | Questions the team needs to answer before resolving |
| `effortLevel` | `"quick-win"`, `"moderate"`, or `"architectural"` | yes | How much work resolution requires (see effort level definitions in SKILL.md) |
| `estimatedFiles` | number or null | no | Approximate number of files that need to change to resolve this conflict |

### conflictBundles[].competingImplementations[]

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Human-readable name |
| `location` | string | yes | File path or paths |
| `whatItSolves` | string | yes | What problem this implementation addresses |

## cleanAreas[]

Each entry records an audited area where no conflicts were found.

| Field | Type | Required | Description |
|---|---|---|---|
| `area` | string | yes | Name of the audited area |
| `summary` | string | yes | Brief statement confirming single clear ownership |
| `evidence` | string[] | yes | File paths or capture references |