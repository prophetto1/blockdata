# Benchmark and Evaluation Unit Packaging Structures v4

**IMPORTANT** This document is meant to develop into the canonical home describing everything pertaining to benchmark builder and EU builder components, every

** IF THE ANCHOR TEXT P1 PAYLOAD IS INCLUDED IN THE EU - THEN how is the step related information only shown in the benchmark packet and not in the EU? **

step information has ground truth that is dependent on the anchor text - shouldn't this be in the EU as step information?

step information includes prompts that might be the same across all unique EUs, also the exact traceable actions executed by the runner is the same across al EUs of a benchmark - these might be shown in the benchmark packet because it is one specification used globally across all benchmark EUs. 

But citations extracted are different - where are those shown? ground truths will be different - where are those shown? the p2 research packs are anchor text dependent and those are going into the EU - 


In other words, if anchor-dependent data of each question step is inserted into the benchmark packet in the below structures - then they were obviously incorrect for not considering anchor-dependent data.

All benchmark-level spec, global unchanging spec/data goes into benchmark packet.

All anchor-dependent data goes into the individual EUs. 

---

## Complete Directory Structure

### Benchmark Packet (static, compiled at build-time)

generalized - 
```
benchmark/
├── benchmark.json        # Benchmark metadata + config
├── plan.json             # Step order, payload admission steps, context 
├── model_steps/          # Step prompt files for evaluated model
│   ├── AG-1.json         # Step 1: task 1 
│   ├── AG-2.json         # Step 2: task 2
│   ├── AG-3.json         # Step 3: ...
│   ├── ...
│   ├── AG-9.json         # Step 9: task 9
│   └── AG-10.json        # Step 10: task 10
└── judge_steps/          # Judge prompt, rubric, delivery
    └── j10.json          # Judge prompt for scoring j10 output
```
- Below is specific example of how the benchmark packet directory structure might look in Legal-10.

```
benchmark/
├── benchmark.json        # Benchmark metadata + judge config
├── plan.json             # Step order, payload admissions, scorer refs
├── model_steps/          # Step prompt files for evaluated model
│   ├── d1.json           # Step 1: ka-sc
│   ├── d2.json           # Step 2: 
│   ├── d3.json           # Step 3: ...
│   ├── ...
│   ├── d9.json           # Step 9: IRAC v1 (closed-book)
│   └── j10.json          # Step 10: IRAC v2 (open-book, p2 admitted)
└── judge_steps          # Judge rubric files (judge-visible only)
    └── j10.json          # Judge prompt for scoring j10 output
```
These conventions are **author-space decisions**, not platform requirements. Legal-10 uses the labels: 

| Prefix | Meaning | Example |
|--------|---------|---------|
| `d*` | Deterministic scoring step | d1.json, d2.json, d9.json |
| `j*` | Judge model required step | j10.json |
| `p*` | Payload (evidence file) | p1.json, p2.json |
| `c*` | Citation identifier | c1, c2, c3 |

Other evaluations may use entirely different naming schemes.
**Note:** The step labels (d1, d9, j10) are Legal-10 specific. Other evaluations may use different naming schemes.


### EU Packets (sealed, per evaluation unit)

```
eus/
├── {eu_id}/
│   ├── p1.json                  # Anchor payload (candidate-visible when admitted)
│   ├── p2.json                  # Research pack (candidate-visible when admitted)
│   └── ground_truth.json        # Runner-only scoring data (NEVER staged)
└── ... (N instances)
```

### Runtime Artifacts (generated per run)

```
runs/{run_id}/
├── run.jsonl                    # Append-only per-step records
├── audit_log.jsonl              # Hashes + delivery proofs
├── run_manifest.json            # Provenance snapshot
├── summary.json                 # Deterministic rollups
├── trace.jsonl                  # trace events (optional)
└── candidate_state.json         # Final state snapshot (sanitized)

staging/{run_id}/{call_id}/      # Transient, deleted after each call
├── {step_file}.json             # Current step prompt file
├── p1.json                      # Admitted payloads only
└── candidate_state.json         # Prior artifacts (no scores/GT/judge)
```
---

- Since we currently only have defined legal-10, we will use its specific shapes to draft the documentation, but in the future this document should be generalized and normalized by using designated AGChain platform-specific prefixes and terminologies.

## File Schemas

### benchmark.json

Benchmark metadata and judge configuration.

```json
{
  "benchmark_id": "legal10_v1",
  "benchmark_name": "Legal-10",
  "description": "10-step chained legal reasoning evaluation with citation integrity gate",
  "domain": "legal",
  "version": "1.0.0",
  "created_at": "2026-01-22T00:00:00Z",
  "author": {
    "name": "Legal-10",
    "contact": "ag@legalchain.run"
  },
  "step_count": 10,
  "payload_count": 2,
  "judge": {
    "provider": "anthropic",
    "model_id": "claude-opus-4-5-20251101"
  }
}
```

#### benchmark.json Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| `benchmark_id` | Yes | Unique identifier for this benchmark |
| `benchmark_name` | Yes | Human-readable name |
| `description` | Yes | Brief description of what this benchmark evaluates |
| `domain` | Yes | Domain category (e.g., "legal", "medical", "financial") |
| `version` | Yes | Semantic version string |
| `created_at` | Yes | ISO 8601 timestamp |
| `author` | No | Author/creator information |
| `step_count` | No | Number of steps (informational) |
| `payload_count` | No | Number of payloads (informational) |
| `judge` | Yes | Judge model configuration |

---

### plan.json

Single source of truth for orchestration: step order, payload injection, scoring type, scorer reference, and output contract.

**must be updated to match final 10-step setup**

```json
{
  "plan_id": "legal10_v1_plan",
  "plan_version": "1.0.0",
  "benchmark_id": "legal10_v1",
  "steps": [
    {
      "step_id": "d1",
      "step_file": "model_steps/d1.json",
      "scoring": "deterministic",
      "scorer_ref": "citation_extraction_scorer",
      "output_contract": "citation_extraction_v1",
      "inject_payloads": ["p1"]
    },
    {
      "step_id": "d2",
      "step_file": "model_steps/d2.json",
      "scoring": "deterministic",
      "scorer_ref": "context_identification_scorer",
      "output_contract": "context_identification_v1"
    },
    {
      "step_id": "d3",
      "step_file": "model_steps/d3.json",
      "scoring": "deterministic",
      "scorer_ref": "citation_categorization_scorer",
      "output_contract": "citation_categorization_v1"
    },
    {
      "step_id": "d4",
      "step_file": "model_steps/d4.json",
      "scoring": "deterministic",
      "scorer_ref": "importance_rating_scorer",
      "output_contract": "importance_rating_v1"
    },
    {
      "step_id": "d5",
      "step_file": "model_steps/d5.json",
      "scoring": "deterministic",
      "scorer_ref": "authority_ranking_scorer",
      "output_contract": "authority_ranking_v1"
    },
    {
      "step_id": "d6",
      "step_file": "model_steps/d6.json",
      "scoring": "deterministic",
      "scorer_ref": "precedent_analysis_scorer",
      "output_contract": "precedent_analysis_v1"
    },
    {
      "step_id": "d7",
      "step_file": "model_steps/d7.json",
      "scoring": "deterministic",
      "scorer_ref": "legal_principle_scorer",
      "output_contract": "legal_principle_v1"
    },
    {
      "step_id": "d8",
      "step_file": "model_steps/d8.json",
      "scoring": "deterministic",
      "scorer_ref": "synthesis_prep_scorer",
      "output_contract": "synthesis_prep_v1"
    },
    {
      "step_id": "d9",
      "step_file": "model_steps/d9.json",
      "scoring": "deterministic",
      "scorer_ref": "irac_closed_scorer",
      "output_contract": "irac_v1"
    },
    {
      "step_id": "j10",
      "step_file": "model_steps/j10.json",
      "scoring": "judge",
      "judge_prompt_file": "judge_prompts/j10.json",
      "output_contract": "irac_v2",
      "inject_payloads": ["p2"]
    }
  ]
}
```

#### plan.json Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| `plan_id` | Yes | Unique identifier for this plan |
| `plan_version` | Yes | Semantic version of this plan |
| `benchmark_id` | Yes | Reference to parent benchmark |
| `steps` | Yes | Ordered array of step definitions |
| `steps[].step_id` | Yes | Author's unique identifier for this step |
| `steps[].step_file` | Yes | Path to step prompt file, relative to benchmark root |
| `steps[].scoring` | Yes | `"deterministic"` or `"judge"` |
| `steps[].scorer_ref` | If deterministic | Scorer implementation ID (Runner resolves from registry) |
| `steps[].judge_prompt_file` | If judge | Path to judge prompt file, relative to benchmark root |
| `steps[].output_contract` | Yes | Contract ID for response validation |
| `steps[].inject_payloads` | No | Array of payload IDs to inject at this step |

#### Optional Step-Level Fields (Future)

| Field | Description |
|-------|-------------|
| `carry_forward` | Array of field names to carry from this step's output to next step's state |
| `timeout_ms` | Maximum time for model response (default: 60000) |
| `max_tokens` | Maximum tokens for model response (default: 4096) |
| `depends_on` | Array of step_ids this step depends on (currently implicit by order) |

---

## Payload Injection

Payloads are injected into step messages using placeholder syntax.

### Placeholder Syntax

| Placeholder | Resolves To |
|-------------|-------------|
| `{p1}` | Entire p1.json content (serialized) |
| `{p1.anchor}` | The `anchor` object from p1.json |
| `{p1.anchor.text}` | The `text` field within `anchor` |
| `{p1.citations}` | The `citations` array from p1.json |
| `{p2}` | Entire p2.json content |
| `{p2.authorities}` | The `authorities` array from p2.json |
| `{p2.authorities[0].text}` | Text of first authority |
| `{candidate_state.field}` | Field from prior step outputs |

### Injection Rules

1. Placeholders are resolved **after** payloads are admitted via `inject_payloads`
2. Referencing an unadmitted payload is a **runtime error**
3. Deep path resolution uses dot notation
4. Array indexing uses bracket notation: `[0]`, `[1]`, etc.
5. Missing paths resolve to empty string with warning in audit log

### Example Step Message with Injection

```json
{
  "step_id": "d1",
  "messages": [
    {
      "role": "system",
      "content": "You are analyzing a Supreme Court opinion. Use only the provided text."
    },
    {
      "role": "user",
      "content": "Analyze the following opinion:\n\n{p1.anchor.text}\n\nList all citations, identify context for each, categorize each by type, and rate importance."
    }
  ],
  "response_format": {
    "type": "json",
    "schema": {
      "citations": {
        "type": "array",
        "items": {
          "citation_id": "string",
          "usCite": "string",
          "caseName": "string"
        }
      },
      "contexts": {
        "type": "array",
        "items": "string"
      },
      "categories": {
        "type": "array",
        "items": "string"
      },
      "importance_ratings": {
        "type": "array",
        "items": {
          "citation_id": "string",
          "rating": "number",
          "rationale": "string"
        }
      }
    }
  }
}
```

---

## Response Format Definition

The `response_format` field specifies the expected output structure.

### Simple Schema (Minimal)

```json
"response_format": {
  "type": "json",
  "schema": {
    "field_name": "type"
  }
}
```

**Supported simple types:** `"string"`, `"number"`, `"boolean"`, `"array"`, `"object"`

### Rich Schema (Recommended)

```json
"response_format": {
  "type": "json",
  "schema": {
    "field_name": {
      "type": "array",
      "items": {
        "subfield1": "string",
        "subfield2": "number"
      }
    },
    "another_field": {
      "type": "number",
      "min": 0,
      "max": 10
    }
  }
}
```

**Rich schema features:**
- `items` for array element definition
- `min`, `max` for numeric constraints
- Nested object definitions

**Validation:** The Runner validates responses against this schema. Invalid responses fail the step with a validation error recorded in `scoring_details`.

---

## Step File Schemas

### model_steps/{step_id}.json (Deterministic Step)

```json
{
  "step_id": "d1",
  "step_name": "Citation Extraction",
  "description": "Extract all citations from the anchor opinion",
  "messages": [
    {
      "role": "system",
      "content": "You are analyzing a Supreme Court opinion. Use only the provided text."
    },
    {
      "role": "user",
      "content": "Analyze the following opinion:\n\n{p1.anchor.text}\n\nProvide all citations with their contexts, categories, and importance ratings."
    }
  ],
  "response_format": {
    "type": "json",
    "schema": {
      "citations": {
        "type": "array",
        "items": {
          "citation_id": "string",
          "usCite": "string",
          "caseName": "string"
        }
      },
      "contexts": {"type": "array", "items": "string"},
      "categories": {"type": "array", "items": "string"},
      "importance_ratings": {"type": "array", "items": "number"}
    }
  }
}
```

### model_steps/{step_id}.json (Judge-Scored Step)

```json
{
  "step_id": "j10",
  "step_name": "IRAC Synthesis (Open-Book)",
  "description": "Write IRAC analysis with access to authority texts",
  "messages": [
    {
      "role": "system",
      "content": "You now have access to the authority texts. Synthesize them with the anchor case."
    },
    {
      "role": "user",
      "content": "Using the anchor case and the following authorities:\n\n{p2.authorities}\n\nWrite a complete IRAC analysis."
    }
  ],
  "response_format": {
    "type": "json",
    "schema": {
      "issue": "string",
      "rule": "string",
      "application": "string",
      "conclusion": "string"
    }
  }
}
```

### judge_prompts/{step_id}.json (Judge Rubric)

```json
{
  "step_id": "j10",
  "grades_step": "j10",
  "rubric_version": "irac_v1",
  "messages": [
    {
      "role": "system",
      "content": "You are evaluating a legal IRAC synthesis. Score each component 0-10."
    },
    {
      "role": "user",
      "content": "Original task:\n{step_prompt}\n\nResponse to evaluate:\n{response}\n\nScore each IRAC component."
    }
  ],
  "rubric": {
    "components": [
      {
        "name": "issue",
        "description": "Is the legal issue clearly and correctly stated?",
        "min": 0,
        "max": 10,
        "weight": 0.25
      },
      {
        "name": "rule",
        "description": "Is the rule accurately drawn from the authorities?",
        "min": 0,
        "max": 10,
        "weight": 0.25
      },
      {
        "name": "application",
        "description": "Is the rule properly applied to the facts?",
        "min": 0,
        "max": 10,
        "weight": 0.25
      },
      {
        "name": "conclusion",
        "description": "Does the conclusion follow logically?",
        "min": 0,
        "max": 10,
        "weight": 0.25
      }
    ],
    "aggregation": "weighted_sum"
  },
  "response_format": {
    "type": "json",
    "schema": {
      "issue_score": {"type": "number", "min": 0, "max": 10},
      "rule_score": {"type": "number", "min": 0, "max": 10},
      "application_score": {"type": "number", "min": 0, "max": 10},
      "conclusion_score": {"type": "number", "min": 0, "max": 10},
      "reasoning": "string"
    }
  }
}
```

#### Judge Prompt Placeholders

| Placeholder | Description |
|-------------|-------------|
| `{response}` | The evaluated model's JSON response (serialized) |
| `{step_prompt}` | The original step prompt sent to evaluated model |

**Substitution rules:**
- Responses exceeding 50,000 characters are truncated with `... [TRUNCATED]`
- No escaping is applied - raw text insertion

---

## Payload Schemas

### eus/{eu_id}/p1.json (Anchor Payload)

```json
{
  "payload_id": "p1",
  "payload_version": "1.0.0",
  "type": "anchor",
  "candidate_visible": true,
  "content": {
    "anchor": {
      "caseId": "1973-116",
      "usCite": "410 U.S. 113",
      "caseName": "Roe v. Wade",
      "term": 1972,
      "dateDecision": "1973-01-22",
      "text": "<full opinion text>",
      "char_count": 45000
    }
  },
  "metadata": {
    "citations": [
      {
        "citation_id": "c1",
        "usCite": "381 U.S. 479",
        "caseName": "Griswold v. Connecticut"
      },
      {
        "citation_id": "c2",
        "usCite": "367 U.S. 497",
        "caseName": "Poe v. Ullman"
      }
    ],
    "total_citations": 47
  }
}
```

### eus/{eu_id}/p2.json (Authorities Payload)

```json
{
  "payload_id": "p2",
  "payload_version": "1.0.0",
  "type": "authorities",
  "candidate_visible": true,
  "content": {
    "authorities": [
      {
        "citation_id": "c1",
        "usCite": "381 U.S. 479",
        "caseName": "Griswold v. Connecticut",
        "text": "<syllabus or head_matter>",
        "char_count": 8500
      },
      {
        "citation_id": "c2",
        "usCite": "367 U.S. 497",
        "caseName": "Poe v. Ullman",
        "text": "<syllabus or head_matter>",
        "char_count": 7200
      }
    ]
  },
  "metadata": {
    "authority_scores": {
      "c1": {"fowler_score": 0.89, "citation_count": 156},
      "c2": {"fowler_score": 0.82, "citation_count": 89}
    }
  }
}
```

**Note:** The `metadata` section contains scoring-relevant data that may or may not be candidate-visible depending on evaluation design. The `content` section is always candidate-visible when admitted.

---

### eus/{eu_id}/ground_truth.json (Runner-Only)

Step-keyed structure for multi-step deterministic scoring.

```json
{
  "eu_id": "eu_case_001",
  "eu_version": "1.0.0",
  "anchor_caseId": "1973-116",

  "step_ground_truth": {
    "d1": {
      "expected_citation_count": 47,
      "citation_roster": ["c1", "c2", "c3"],
      "scorer": "citation_extraction_scorer"
    },
    "d2": {
      "expected_contexts": {
        "c1": "substantive",
        "c2": "procedural"
      },
      "scorer": "context_identification_scorer"
    },
    "d3": {
      "expected_categories": {
        "c1": "constitutional",
        "c2": "statutory"
      },
      "scorer": "citation_categorization_scorer"
    },
    "d4": {
      "expected_importance": {
        "c1": 9,
        "c2": 7
      },
      "tolerance": 1,
      "scorer": "importance_rating_scorer"
    },
    "d5": {
      "expected_ranking": ["c1", "c2", "c3"],
      "scorer": "authority_ranking_scorer"
    },
    "d6": {
      "expected_precedents": ["c1"],
      "scorer": "precedent_analysis_scorer"
    },
    "d7": {
      "expected_principles": ["privacy", "due_process"],
      "scorer": "legal_principle_scorer"
    },
    "d8": {
      "expected_synthesis_elements": ["issue", "rule", "facts"],
      "scorer": "synthesis_prep_scorer"
    },
    "d9": {
      "irac_criteria": {
        "issue_keywords": ["privacy", "constitutional"],
        "rule_citations": ["c1", "c2"]
      },
      "scorer": "irac_closed_scorer"
    }
  },

  "citation_labels": {
    "c1": {
      "depth_label": "DISCUSSED",
      "confidence": 0.95,
      "shepard_treatment": "FOLLOWED"
    },
    "c2": {
      "depth_label": "CITED",
      "confidence": 0.88,
      "shepard_treatment": "DISTINGUISHED"
    }
  },

  "integrity_gate": {
    "canonical_citations": ["c1", "c2", "c3", "c4", "c5"],
    "synthetic_traps": [
      {
        "trap_id": "trap_001",
        "usCite": "999 U.S. 999",
        "caseName": "Fabricated v. Nonexistent",
        "reason": "impossible_cite"
      },
      {
        "trap_id": "trap_002",
        "usCite": "410 U.S. 999",
        "caseName": "Smith v. Jones (2087)",
        "reason": "future_date"
      }
    ]
  },

  "scdb_metadata": {
    "caseDisposition": {
      "value": 3,
      "meaning": "reversed"
    },
    "partyWinning": {
      "value": 1,
      "meaning": "petitioner"
    },
    "decisionDirection": {
      "value": 2,
      "meaning": "liberal"
    }
  }
}
```

#### SCDB Field Reference

| Field | Values | Meaning |
|-------|--------|---------|
| `caseDisposition` | 1=stay/affirmed, 2=affirmed, 3=reversed, 4=reversed/remanded, 5=vacated/remanded, 6=affirmed in part, 7=vacated, 8=petition granted, 9=cert dismissed | How SCOTUS disposed of the case |
| `partyWinning` | 1=petitioner, 0=respondent, 2=unclear | Which party won |
| `decisionDirection` | 1=conservative, 2=liberal, 3=unspecifiable | Ideological direction |

---

## Runtime Artifact Schemas

### runs/{run_id}/run.jsonl

Append-only per-step records. Each line is a JSON object.

```json
{
  "run_id": "run_20260122_001",
  "call_id": "call_001",
  "step_id": "d1",
  "step_index": 0,
  "timestamp": "2026-01-22T10:30:00Z",
  "payloads_admitted": ["p1"],
  "raw_output": "{\"citations\": [...], ...}",
  "parsed": {
    "citations": [...],
    "contexts": [...],
    "categories": [...],
    "importance_ratings": [...]
  },
  "validation": {
    "passed": true,
    "errors": []
  },
  "score": 0.92,
  "scoring_details": {
    "citation_count_expected": 47,
    "citation_count_actual": 45,
    "match_rate": 0.957
  },
  "latency_ms": 2340,
  "tokens_used": 1856
}
```

For judge-scored steps, additional fields:

```json
{
  "run_id": "run_20260122_001",
  "call_id": "call_010",
  "step_id": "j10",
  "step_index": 9,
  "timestamp": "2026-01-22T10:45:00Z",
  "payloads_admitted": ["p1", "p2"],
  "raw_output": "{\"issue\": \"...\", ...}",
  "parsed": {...},
  "validation": {"passed": true, "errors": []},
  "judge_evaluation": {
    "judge_call_id": "judge_call_001",
    "judge_prompt_file": "judge_prompts/j10.json",
    "judge_raw_output": "{\"issue_score\": 8, ...}",
    "judge_parsed": {
      "issue_score": 8,
      "rule_score": 9,
      "application_score": 7,
      "conclusion_score": 8,
      "reasoning": "..."
    }
  },
  "score": 0.80,
  "scoring_details": {
    "component_scores": {
      "issue": 8,
      "rule": 9,
      "application": 7,
      "conclusion": 8
    },
    "aggregation": "weighted_sum",
    "weights": [0.25, 0.25, 0.25, 0.25]
  },
  "latency_ms": 4520,
  "tokens_used": 3421
}
```

### runs/{run_id}/audit_log.jsonl

Append-only audit records proving what was visible at each step.

```json
{
  "run_id": "run_20260122_001",
  "call_id": "call_001",
  "step_id": "d1",
  "timestamp": "2026-01-22T10:30:00Z",
  "staged_files": [
    {"path": "d1.json", "hash": "sha256:abc123..."},
    {"path": "p1.json", "hash": "sha256:def456..."},
    {"path": "candidate_state.json", "hash": "sha256:ghi789..."}
  ],
  "message_hash": "sha256:jkl012...",
  "message_byte_count": 48576,
  "ground_truth_accessed": false,
  "judge_prompts_accessed": false
}
```

### runs/{run_id}/run_manifest.json

Provenance snapshot for reproducibility.

```json
{
  "run_id": "run_20260122_001",
  "benchmark_id": "legal10_v1",
  "benchmark_version": "1.0.0",
  "eu_id": "eu_case_001",
  "eu_version": "1.0.0",
  "runner_version": "2.1.0",
  "started_at": "2026-01-22T10:30:00Z",
  "completed_at": "2026-01-22T10:50:00Z",
  "evaluated_model": {
    "provider": "openai",
    "model_id": "gpt-4o-2024-08-06",
    "temperature": 0.0,
    "max_tokens": 4096
  },
  "judge_model": {
    "provider": "anthropic",
    "model_id": "claude-opus-4-5-20251101",
    "temperature": 0.0
  },
  "file_hashes": {
    "benchmark/benchmark.json": "sha256:...",
    "benchmark/plan.json": "sha256:...",
    "eus/eu_case_001/p1.json": "sha256:...",
    "eus/eu_case_001/p2.json": "sha256:...",
    "eus/eu_case_001/ground_truth.json": "sha256:..."
  },
  "reproducibility_key": "sha256:combined_hash..."
}
```

### runs/{run_id}/summary.json

Aggregate scores computed from run.jsonl.

```json
{
  "run_id": "run_20260122_001",
  "benchmark_id": "legal10_v1",
  "eu_id": "eu_case_001",
  "evaluated_model": "gpt-4o-2024-08-06",
  "completed_at": "2026-01-22T10:50:00Z",
  "step_scores": {
    "d1": 0.92,
    "d2": 0.88,
    "d3": 0.95,
    "d4": 0.85,
    "d5": 0.90,
    "d6": 0.87,
    "d7": 0.91,
    "d8": 0.89,
    "d9": 0.82,
    "j10": 0.80
  },
  "aggregate_score": 0.879,
  "aggregation_method": "arithmetic_mean",
  "chain_completion": true,
  "integrity_check": {
    "passed": true,
    "canonical_citations_found": 45,
    "synthetic_traps_triggered": 0,
    "fabricated_citations": []
  },
  "total_latency_ms": 28500,
  "total_tokens": 24560
}
```

### runs/{run_id}/trace.jsonl (Optional)

LangGraph-shaped events for observability integration.

```json
{
  "event_type": "step_start",
  "run_id": "run_20260122_001",
  "step_id": "d1",
  "timestamp": "2026-01-22T10:30:00Z",
  "metadata": {"payloads_admitted": ["p1"]}
}
```

```json
{
  "event_type": "model_call",
  "run_id": "run_20260122_001",
  "step_id": "d1",
  "timestamp": "2026-01-22T10:30:01Z",
  "input_tokens": 1200,
  "output_tokens": 656
}
```

```json
{
  "event_type": "step_complete",
  "run_id": "run_20260122_001",
  "step_id": "d1",
  "timestamp": "2026-01-22T10:30:03Z",
  "score": 0.92,
  "latency_ms": 2340
}
```

### runs/{run_id}/candidate_state.json

Final sanitized state snapshot.

```json
{
  "run_id": "run_20260122_001",
  "eu_id": "eu_case_001",
  "final_step": "j10",
  "accumulated_outputs": {
    "d1": {
      "citations": [...],
      "contexts": [...]
    },
    "d2": {...},
    "d9": {
      "issue": "...",
      "rule": "...",
      "application": "...",
      "conclusion": "..."
    },
    "j10": {
      "issue": "...",
      "rule": "...",
      "application": "...",
      "conclusion": "..."
    }
  }
}
```

**Sanitization rules:** This file contains ONLY model-produced outputs. It never contains:
- Ground truth data
- Scores or scoring details
- Judge outputs
- Internal runner state

---

## Registries

### Scorer Registry

Scorers are resolved by `scorer_ref` from a registry.

**Registry location:** `benchmark/scorers/registry.json` (or platform-level registry)

```json
{
  "citation_extraction_scorer": {
    "type": "deterministic",
    "implementation": "scorers.citation_extraction",
    "version": "1.0.0",
    "ground_truth_fields": ["step_ground_truth.d1"]
  },
  "context_identification_scorer": {
    "type": "deterministic",
    "implementation": "scorers.context_identification",
    "version": "1.0.0",
    "ground_truth_fields": ["step_ground_truth.d2"]
  }
}
```

### Output Contract Registry

Output contracts define validation schemas.

**Registry location:** `benchmark/contracts/registry.json` (or platform-level registry)

```json
{
  "citation_extraction_v1": {
    "version": "1.0.0",
    "schema": {
      "citations": {"type": "array", "required": true},
      "contexts": {"type": "array", "required": true},
      "categories": {"type": "array", "required": true},
      "importance_ratings": {"type": "array", "required": true}
    }
  },
  "irac_v1": {
    "version": "1.0.0",
    "schema": {
      "issue": {"type": "string", "required": true, "min_length": 50},
      "rule": {"type": "string", "required": true, "min_length": 100},
      "application": {"type": "string", "required": true, "min_length": 200},
      "conclusion": {"type": "string", "required": true, "min_length": 50}
    }
  }
}
```

---

## Isolation Guarantees

### Staging Directory Pattern (Required)

The Runner MUST use a staging directory pattern to enforce isolation.

**Before each step:**

1. Create a clean temporary staging directory: `staging/{run_id}/{call_id}/`
2. Copy ONLY the current step file to staging
3. Copy ONLY admitted payloads to staging
4. Copy the sanitized `candidate_state.json` to staging
5. The evaluated model adapter reads ONLY from the staging directory
6. After step completion, clean up staging directory

**This makes leakage physically impossible** - the evaluated model adapter has no filesystem path to access anything outside staging.

### What Cannot Leak (and Why)

| Content | Why It Cannot Leak |
|---------|-------------------|
| `ground_truth.json` | Never copied to staging |
| `judge_prompts/*.json` | Never copied to staging |
| Future step files | Not yet copied to staging |
| Unadmitted payloads | Not copied until scheduled in `inject_payloads` |
| Other EU data | Runner only accesses current EU's files |
| Scores and scoring details | Never in candidate_state.json |

### Verification Requirements

Runner implementations MUST include tests that verify:

1. `ground_truth.json` never appears in evaluated model messages
2. `judge_prompts/` files never appear in evaluated model messages
3. Future step contents never appear in evaluated model messages
4. Unadmitted payload contents never appear in evaluated model messages
5. Scores and judge outputs never appear in candidate_state.json

---

## Scoring

### Per-Step Scoring

The Runner scores **after every step**, not just at the end:

1. Step completes → Runner validates response against `output_contract`
2. For deterministic scoring: Runner loads `scorer_ref` from registry, compares against `ground_truth.json`
3. For judge scoring: Runner sends to judge adapter with rubric, Runner aggregates component scores
4. Step score recorded immediately to `run.jsonl`

### Aggregation

- **Component scores** (judge): Aggregated by Runner using rubric weights, not by judge
- **Step scores**: Aggregated into `summary.json` using specified method (default: arithmetic mean)
- **Chain completion**: Boolean indicating all steps completed successfully

### No Voiding

This spec does NOT void runs. If a step fails validation or integrity checks:

- The step receives a score (possibly 0)
- Failures are recorded in `scoring_details`
- The run continues to completion
- All steps produce scores

---

## What Each Actor Sees

| Actor | Can Access | Cannot Access |
|-------|------------|---------------|
| Evaluated Model | Current step file, admitted payloads, sanitized candidate_state (via staging only) | ground_truth.json, judge_prompts/*, future steps, unadmitted payloads, other EUs, scores |
| Judge Model | Judge prompt file, evaluated model's response for graded step | Evaluated model session, ground_truth, other steps |
| Runner | Everything (constructs staging views, accesses ground_truth for scoring) | N/A |
| Auditor | All run artifacts, can reconstruct what was visible at each step | N/A |

---

## Runner CLI

```bash
runner --benchmark=benchmark/ --eu-id=eu_case_001 --model=gpt-4o --output=runs/
```

**Required arguments:**
- `--benchmark`: Path to benchmark packet directory
- `--eu-id`: Evaluation unit ID to run

**Optional arguments:**
- `--model`: Evaluated model identifier (or use config)
- `--output`: Output directory for run artifacts
- `--judge`: Override judge model
- `--dry-run`: Validate packages without executing

---

_Last updated: 2026-01-22_
