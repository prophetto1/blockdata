# Dual-PC Branch Status One-Pager

## Purpose

This note explains the current two-PC setup in neutral terms and asks for opinions on the operating model going forward.

## Machine map

- Host `192.168.0.84`
  - local repo path: `E:\blockdata-agchain`
  - active branch: `buddy`
  - GitHub push target in current workflow: `origin/buddy`

- Host `192.168.0.110` (`Jon.local`)
  - repo path on that machine: `E:\writing-system`
  - same repo visible from `192.168.0.84` at: `P:\writing-system`
  - active branch in current workflow: `master`
  - GitHub push target in current workflow: `origin/master`

## Current Git status

- Branch `buddy` and branch `master` are not the same.
- Branch `buddy` contains committed work that does not exist on `master`.
- Branch `master` contains committed work that does not exist on `buddy`.
- Current divergence check shows `2` commits on the `buddy` side and `2` commits on the `master` side.
- Current checks also show `origin/master` and the committed `master` state from host `192.168.0.110` at the same commit.
- For committed history, GitHub `origin/master` is currently a valid proxy for branch `master` on host `192.168.0.110`.

## Important caveat

Git history does not describe the full machine-to-machine picture.

Direct LAN transfer is also available between `192.168.0.84` and `192.168.0.110`.

That creates two separate kinds of drift:

1. Git drift
   - different commits on `buddy` and `master`
   - different pushed branch history on GitHub

2. Live machine drift
   - copied files moved over SMB
   - uncommitted edits
   - untracked files
   - generated artifacts present on one machine and absent on the other

A Git comparison can answer branch divergence. A Git comparison cannot guarantee full file-level identity between the two machines at a given moment.

## Why the current model creates confusion

- Host `192.168.0.84` is working from `buddy`.
- Host `192.168.0.110` is working from `master`.
- Direct file transfer is also possible between the two machines.
- A difference can therefore come from:
  - branch divergence
  - uncommitted local edits
  - copied files
  - generated artifacts

There is also a repo hygiene problem on the network-visible Git path for host `192.168.0.110`. A bogus `desktop.ini` Git ref is being advertised there, and direct fetch from that path is unreliable until cleanup is complete.

## Decision needed

Feedback is requested on the best operating model from here.

### Option A: GitHub as source of truth for source code

- Use Git for source-code movement between `192.168.0.84` and `192.168.0.110`.
- Limit SMB copy to datasets, generated artifacts, screenshots, logs, and emergency recovery.
- Stop using `master` as an active day-to-day work branch.
- Give each machine a dedicated work branch.
- Reserve `master` for integration.

### Option B: Mixed Git and file-copy workflow

- Continue using Git branches and direct file transfer for source changes when convenient.
- Accept machine-to-machine drift that Git does not fully describe.
- Accept higher reconciliation overhead and higher ambiguity during handoff.

## Recommended model

Recommended model:

- Git for code
- SMB for artifacts
- `master` for integration
- one active work branch per machine

That model provides the clearest source of truth and the cleanest handoff path between `192.168.0.84` and `192.168.0.110`.

## Feedback requested

1. Should GitHub become the only source of truth for source code shared between `192.168.0.84` and `192.168.0.110`?
2. Should host `192.168.0.110` stop using `master` as an active work branch and move to a dedicated branch?
3. Should SMB copy be limited to artifacts and emergency transfer only?
4. Should the direct Git remote to `P:\writing-system\.git` remain in use after cleanup, or should GitHub become the only normal transport?
