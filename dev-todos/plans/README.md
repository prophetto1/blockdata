# Dev Todos

This folder is **spec-first**. Todo files track execution status only.

## Source Of Truth (Engineering Decisions)

1. `detailed-implementation-plans/`  
   Canonical implementation/spec decisions. Engineering choices must come from these docs (or an explicitly approved plan/spec update).
2. `plans/`  
   Active implementation specs for current workstreams.
3. `complete/`  
   Completed implementation records and evidence.

Rule: one-line todo text is never a substitute for spec detail.

## Tracking Files (Status Only)

1. `todos-backlog.md`  
   Open work inventory (tracking shorthand only).
2. `todos-queue.md`  
   Execution order and current focus (tracking shorthand only).
3. `todos-done-log.md`  
   Completion log with verification evidence.

## Operating Rules

1. Do not derive architecture/product decisions from `todos-backlog.md` or `todos-queue.md` text alone.
2. Every implementation task must cite a governing spec/plan document before coding.
3. Keep open checkboxes only in `todos-backlog.md` and `todos-queue.md`.
4. Move completed items to `todos-done-log.md` immediately with verification evidence (deploy/test/API/SQL proof).
5. When meaningful progress occurs on an `In Progress` item, update `todos-queue.md` with a dated progress note before handoff.
6. Every newly discovered config/policy requirement must be logged first in `config-decision-log.md` with layer, owner, default, enforcement path, and linked todo.
7. New config keys are not implementation-ready until they identify a canonical storage target (`Environment`, `Superuser Policy`, `User Config`, or `Agent Config`).

## Folder Notes

1. `archive/`  
   Legacy planning/spec/handoff docs (historical reference).
2. `detailed-implementation-plans/`  
   Required reading before implementation/review decisions.
3. `config-decision-log.md`  
   Canonical intake/ledger for new configuration decisions and ownership.
