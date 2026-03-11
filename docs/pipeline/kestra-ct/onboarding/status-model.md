# Kestra Status Model

## Purpose

This file defines the status meanings used in `page-registry.yaml` and the intended state changes for one page as each environment works through it.

## CT Packet Statuses

- `packet_pending`
  The page is in the master registry, but no shared packet exists yet.
- `packet_seeded`
  The shared packet exists, but page execution has not yet produced finished side-specific evidence.
- `packet_in_revision`
  The shared packet exists and is being corrected or expanded.
- `packet_ready`
  The shared packet is stable enough for both environments to execute against it.
- `packet_blocked`
  The shared packet cannot progress because a shared prerequisite or unresolved contract issue blocks it.
- `packet_complete`
  The shared packet has been executed, reconciled, and closed for the current scope.

## Per-Side Execution Statuses

- `not_started`
  The side has not begun that page.
- `capturing`
  The side is tracing the page and filling capture facts.
- `planning`
  The side is writing the implementation plan.
- `implementing`
  The side is making runtime changes.
- `verifying`
  The side is running endpoint, page, and test verification.
- `blocked`
  The side is stopped on a documented blocker.
- `partial`
  The side completed part of the slice, but not enough to claim page completion.
- `done`
  The side completed the page for the assigned scope with verification evidence.

## Registry Ownership Rule

Field ownership is split:

- `ct_status` is the shared packet lifecycle field
- `ubuntu_status` is owned by Ubuntu execution
- `windows_status` is owned by Windows execution

Page workers should normally update only their side field.

Do not write environment execution results such as `done`, `blocked`, or `partial` into `ct_status` unless you are intentionally updating the shared packet lifecycle.

## Meaning Of `packet_seeded` For `flows_list`

For `flows_list`, `packet_seeded` means:

- the shared packet exists
- the shared scope is frozen enough to start
- the worker should begin with `capture.md`
- the page is not implemented yet
- the page is not verified yet

## Expected State Changes For One Page

Typical flow:

1. `ct_status: packet_pending`
2. `ct_status: packet_seeded`
3. `ubuntu_status: capturing` and `windows_status: capturing`
4. each side moves through `planning`, `implementing`, `verifying`
5. each side ends at `done`, `partial`, or `blocked`
6. if both sides align, set `ct_status: packet_complete`
7. if both sides expose a shared issue, set `ct_status: packet_blocked` or `packet_in_revision`

## Claim Rule

Before starting page work:

- Windows worker sets `windows_status: capturing`
- Ubuntu worker sets `ubuntu_status: capturing`

If that side already shows an active in-progress state, stop and reconcile before continuing.

If the registry does not yet track owner names, assume one worker per side at a time for a given page.

## Shared Prerequisite Blockers

If a page is blocked by a cross-cutting prerequisite, keep the page packet in place and mark the side status `blocked`.

Examples:

- missing dev compatibility gateway
- missing bootstrap endpoint
- unresolved auth path
- unresolved packet contract
