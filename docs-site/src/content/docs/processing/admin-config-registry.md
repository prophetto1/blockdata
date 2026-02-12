---
title: Admin Config Registry
description: Ownership layers and the superuser control design standard.
sidebar:
  order: 3
---

**Spec version:** v1.0  
**Date:** 2026-02-12  
**Source:** `docs/ongoing-tasks/complete/0211-admin-config-registry.md`  
**Status:** Canonical — implemented and verified in production

---

## Scope

This page defines two things:

1. The ownership model for runtime configuration (environment vs admin policy vs run/schema/user scope).
2. The standard “control contract” pattern that every superuser-managed policy key must follow.

It does **not** attempt to enumerate every policy key, document every default value, or preserve one-off verification evidence.

---

<!-- BEGIN VERBATIM COPY from docs/ongoing-tasks/complete/0211-admin-config-registry.md (Sections 3 and 5) -->
<!-- Surgical edits: replaced typographic arrows with `->` for encoding safety. -->

## 3) Ownership Model (Locked)

### Layer A: Environment (deployment-level)

- Secrets and deployment overrides:
  - `ANTHROPIC_API_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `WORKER_MAX_RETRIES`
  - `WORKER_DEFAULT_MODEL`
  - `DOCUMENTS_BUCKET`

### Layer B: Admin policy (superuser-owned; runtime store implemented in Priority 6)

- Runtime policy keys:
  - `worker.claim_batch_size`
  - `worker.claim_ordering`
  - `worker.default_system_prompt`
  - `worker.default_block_prompt`
  - `models.provider_registry`
  - `models.platform_default_model`
  - `models.platform_default_temperature`
  - `models.platform_default_max_tokens`
  - `upload.max_files_per_batch`
  - `upload.allowed_extensions`

### Layer C: Run/schema/user scope

- Per-user and per-run overrides:
  - `schemas.prompt_config.*`
  - `runs_v2.model_config`
  - `user_api_keys.default_model`
  - `user_api_keys.default_temperature`
  - `user_api_keys.default_max_tokens`
  - `user_api_keys.base_url`

**Rule:** Snapshot effective policy at run creation so mid-run admin changes do not alter in-flight behavior (Priority 6 implementation item).

---

## 5) Superuser Control Design Standard (Priority 6)

This section defines the **standard UX + contract pattern** for every superuser-controlled config value.

The core idea:
- The **value** is adjustable at superuser discretion.
- The **control-plane semantics** are fixed and must not drift.

### 5.1 Standard pattern (apply to every policy key)

For each policy key, the spec must state:

1. **Control**: toggle / slider / dropdown / numeric input (+ exact input if needed).
2. **Scope**: what behavior this key controls (and what it explicitly does not).
3. **Precedence**: where it sits in the override chain (admin baseline vs run/schema/user/env).
4. **Effective value + provenance**: always show `effective=<value> (source=<layer>)`.
5. **Snapshot**: policy changes apply to **new runs only**; runs snapshot effective values at creation.
6. **Safety + validation**: min/max bounds, type validation, and behavior when unset/invalid.
7. **Audit**: record `who/when/from/to` (and optional reason).

### 5.2 Example: `models.platform_default_temperature`

**Goal:** a minimal, playground-style temperature control that is easy to tune without introducing ambiguity.

- **Control**
  - Slider: `0.0 -> 1.0` with step `0.05`
  - Numeric input: exact value (validated to the same bounds)
  - Label anchors (UX only): `0.0 Deterministic`, `0.3 Balanced`, `0.8 Creative`
- **Scope**
  - Sets the admin baseline temperature used **only when** no run/schema/user override provides a temperature.
  - Does not force an in-flight run to change behavior.
- **Precedence**
  - `schemas.prompt_config.temperature` -> `runs_v2.model_config.temperature` -> `user_api_keys.default_temperature` -> **admin policy baseline** -> env fallback -> hardcoded fallback
- **Effective value + provenance**
  - Display: `effective=0.30 (source=admin policy baseline)`
  - If overridden: `effective=0.20 (source=run override)`
- **Snapshot**
  - Applies to runs created after `<timestamp>`.
  - Each run stores a snapshot so mid-run edits do not alter in-flight behavior.
- **Safety + validation**
  - Reject values outside `[0.0, 1.0]`.
  - If unset, fall back to the baseline defined in this registry (and record the source as fallback).
- **Audit**
  - Log: `changed_by`, `changed_at`, `old_value`, `new_value`.

<!-- END VERBATIM COPY -->

