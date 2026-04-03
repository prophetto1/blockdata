---
title: "Legal-10 tests inventory"
sidebar:
  order: 7
---

# Legal-10 Tests — Complete Inventory

**Generated:** 2026-03-30
**Source:** `_agchain/legal-10/tests/`

---

## Summary

**44 tests total, all passing.** 6 test files + 1 helper stub.

---

## Test Files

### test_3_step_run_citation_integrity.py (3 tests)
Tests citation integrity scoring module. Basic validity, fallback parsing, nominative U.S. Reports format.

### test_execution_backend.py (13 tests)
Comprehensive: DirectBackend, InspectBackend, OpenAI/Anthropic adapters, run_3s.py orchestration. Major integration test verifies run metadata, manifest, execution tracking, RuntimeConfig persistence.

### test_irac_judge_requirement.py (2 tests)
Validates S6/S7 step files contain judge_required markers. Verifies S6 composite scoring does NOT claim "DETERMINISTIC ONLY."

### test_profile_registry.py (6 tests)
Profile resolution, registry mechanics, baseline equivalence, per-EU state isolation.

### test_profile_types.py (8 tests)
Pydantic model validation and serialization for Profile, SessionStrategyConfig, StateProviderConfig, ToolStrategyConfig, ProfileConstraints.

### test_runtime_config.py (12 tests)
RuntimeConfig initialization, validation (phase-gated rejection of tools/sandbox/network), serialization, profile integration, custom limits.

### legal_10_runtime_stub.py (helper)
Stub module providing `build_messages` and `CandidateState` imports for registry tests.

---

## Coverage Strengths

- Runtime configuration and validation (excellent)
- Execution backend abstraction (excellent)
- Profile types and registry (excellent)
- Citation integrity scoring (good)

## Coverage Gaps

- **7 of 9 chain steps** lack unit tests (S1-S5, S8-S9)
- Scoring modules beyond citation_integrity (MEE judge, composites) untested
- Data pipeline scripts (0% coverage)
- Staging, auditing, benchmark building (minimal)
- Advanced profile strategies (replay_full, type_i/ii/iii) untested

---

## Test Patterns

- Monkeypatch/mocking of external modules (inspect_ai, openai, anthropic)
- DummyAdapter/FakeBackend test doubles
- Dynamic module loading with importlib
- Pydantic model validation testing
- Parametrized tests for config rejection
- State isolation verification