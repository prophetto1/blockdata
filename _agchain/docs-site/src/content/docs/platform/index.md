---
title: Overview
description: AgChain benchmark authoring and deployment platform — runner engine, staging, state management, audit.
sidebar:
  order: 0
---

AgChain is a benchmark authoring and deployment platform for evaluating LLM reasoning over multi-step, stateful chains. It provides the runtime engine, isolation guarantees, and audit infrastructure that individual benchmarks (runspecs) plug into.

## Core platform concerns

- **Plan-driven execution** — benchmarks declare their chain topology in `plan.json`; the platform executes steps in order
- **Structural no-leak** — staging directories ensure the evaluated model only sees admitted evidence
- **Stateful carry-forward** — sanitized `candidate_state.json` carries model outputs between steps without leaking ground truth
- **Audit instrumentation** — SHA-256 hash proofs of every staged file and model message
- **Sealed evidence** — research packs and evaluation units are built at build time, not retrieved at runtime
