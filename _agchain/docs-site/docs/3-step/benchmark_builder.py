"""Benchmark Builder for Legal-10 3-Step MVP.

Materializes the static benchmark packet from spec definitions:
  benchmark/benchmark.json
  benchmark/plan.json
  benchmark/model_steps/d1.json
  benchmark/model_steps/d2.json
  benchmark/model_steps/j3.json
  benchmark/judge_prompts/irac_mee_pair_v1.json

Usage:
  python benchmark_builder.py --out <bundle_root>
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path


# ---------------------------------------------------------------------------
# Prompt templates (from FDQ specs)
# ---------------------------------------------------------------------------

# d1: KA-SC prompt — from fdq-01-ka-sc.md §2
D1_PROMPT_TEMPLATE = """\
Based on the Supreme Court opinion provided, answer the following questions about the citations used in this opinion.

For each question, respond with the requested citation(s) in standard U.S. reporter format.

1. CONTROLLING AUTHORITY: Which single cited case has the highest precedential authority?

2. IN-FAVOR CITATIONS: Which cited cases does the opinion follow, apply, or rely upon as supporting authority?

3. AGAINST CITATIONS: Which cited cases does the opinion distinguish, question, criticize, or limit?

4. MOST FREQUENT: Which single cited case appears most often in the opinion text?

Respond in the following JSON format:
{
  "controlling_authority": "<citation>",
  "in_favor": ["<citation>", ...],
  "against": ["<citation>", ...],
  "most_frequent": "<citation>"
}"""

# d2: IRAC closed-book — from fdq-09-irac-without-rp.md §2
# (dependency placeholders removed per M1 dev brief)
D2_PROMPT_TEMPLATE = """\
You are a legal research assistant. Synthesize the following information into a complete IRAC legal analysis.

CASE INFORMATION:
- Citation: {anchor_us_cite}
- Name: {anchor_case_name}
- Term: {anchor_term}

ANCHOR TEXT:
{anchor_text}

MODE: CLOSED-BOOK
You have ONLY the anchor text above. Do not cite external authorities.
Do not fabricate case treatment or relationships not evident in the text.

Write a complete IRAC analysis:
1. ISSUE: State the central legal question the Court addressed.
2. RULE: Identify the legal rule or principle the Court applied.
3. APPLICATION: Explain how the Court applied the rule to the facts.
4. CONCLUSION: State the Court's holding and its significance.

Return a JSON object:
- "issue": The legal issue (1-2 sentences)
- "rule": The applicable rule (1-2 sentences)
- "application": How the rule was applied (2-3 sentences)
- "conclusion": The holding and significance (1-2 sentences)
- "citations": List of citations used (may be empty for closed-book)

No extra keys. No markdown code fences."""

# j3: IRAC open-book — from fdq-10-irac-with-rp.md §2
# (dependency placeholders removed per M1 dev brief)
J3_PROMPT_TEMPLATE = """\
You are a legal research assistant. Synthesize the following information into a complete IRAC legal analysis.

CASE INFORMATION:
- Citation: {anchor_us_cite}
- Name: {anchor_case_name}
- Term: {anchor_term}

ANCHOR TEXT:
{anchor_text}

RESEARCH PACK (admitted authorities):
{research_pack_content}

MODE: OPEN-BOOK
You have the anchor text AND a research pack of relevant authorities.
Use the provided authorities to strengthen your analysis.
Only cite authorities from the research pack or the anchor text.
Do not fabricate authorities, quotations, case treatment, or relationships not present in the admitted materials.

Write a complete IRAC analysis:
1. ISSUE: State the central legal question the Court addressed.
2. RULE: Identify the legal rule or principle the Court applied.
3. APPLICATION: Explain how the Court applied the rule to the facts.
4. CONCLUSION: State the Court's holding and its significance.

Return a JSON object:
- "issue": The legal issue (1-2 sentences)
- "rule": The applicable rule (1-2 sentences)
- "application": How the rule was applied (2-3 sentences)
- "conclusion": The holding and significance (1-2 sentences)
- "citations": List of citations used (should reflect use of admitted authorities)

No extra keys. No markdown code fences."""

# Judge prompt — from [fdq] [post] irac pair scoring.md §3
# Step-ID agnostic: uses {STEP_IRAC_CLOSED_ID} and {STEP_IRAC_OPEN_ID}
JUDGE_PROMPT_TEMPLATE = """\
You are a bar exam grader using MEE (Multistate Essay Examination) standards.

You will grade TWO IRAC answers for the SAME anchor case:
- IRAC #1 is CLOSED-BOOK (anchor-only).
- IRAC #2 is OPEN-BOOK (anchor + research pack).

Important grading rules:
1) Grade each IRAC independently using the rubric below.
2) CLOSED-BOOK: Do NOT penalize for limited citation breadth. Focus on whether the issue/rule/application/conclusion are coherent and grounded in the anchor facts provided.
3) OPEN-BOOK: Expect appropriate use of provided authorities (if present in the IRAC). Do NOT verify citations; do NOT browse; do NOT assume missing authorities.
4) Output MUST be valid JSON ONLY (no prose outside JSON, no markdown fences).

=== MEE RUBRIC (0-6 per component) ===

ISSUE (0-6):
- 0-1: Missing or wrong issue
- 2-3: Issue identified but poorly framed
- 4-5: Issue correctly framed as a legal question
- 6: Issue precise and includes material facts

RULE (0-6):
- 0-1: No rule or wrong rule
- 2-3: Rule stated but incomplete
- 4-5: Rule complete with key elements
- 6: Rule synthesized/nuanced (as supported by the provided materials)

APPLICATION (0-6):
- 0-1: No application or purely conclusory
- 2-3: Mechanical matching, little reasoning
- 4-5: Applies rule to facts with clear reasoning
- 6: Handles counterarguments/limitations and explains why they do or do not change the result

CONCLUSION (0-6):
- 0-1: Missing or unsupported
- 2-3: States outcome only
- 4-5: Outcome with reasoning
- 6: Addresses uncertainty/alternatives appropriately

=== IRAC #1 (CLOSED-BOOK) ===
step_id: {STEP_IRAC_CLOSED_ID}

ISSUE:
{CLOSED_issue}

RULE:
{CLOSED_rule}

APPLICATION:
{CLOSED_application}

CONCLUSION:
{CLOSED_conclusion}

=== IRAC #2 (OPEN-BOOK) ===
step_id: {STEP_IRAC_OPEN_ID}

ISSUE:
{OPEN_issue}

RULE:
{OPEN_rule}

APPLICATION:
{OPEN_application}

CONCLUSION:
{OPEN_conclusion}

=== REQUIRED OUTPUT (STRICT JSON) ===
Return a single JSON object with exactly this shape:

{{
  "schema_version": "irac_mee_pair_v1",
  "grades": {{
    "{STEP_IRAC_CLOSED_ID}": {{
      "mode": "closed-book",
      "issue_score": 0,
      "rule_score": 0,
      "application_score": 0,
      "conclusion_score": 0,
      "reasoning": "brief explanation"
    }},
    "{STEP_IRAC_OPEN_ID}": {{
      "mode": "open-book",
      "issue_score": 0,
      "rule_score": 0,
      "application_score": 0,
      "conclusion_score": 0,
      "reasoning": "brief explanation"
    }}
  }}
}}

Rules:
- Scores MUST be integers from 0 to 6.
- reasoning MUST be a single string (keep it short).
- No other top-level keys."""

# ---------------------------------------------------------------------------
# System message — from prompts_v1.0.md §2.4
# ---------------------------------------------------------------------------

SYSTEM_MESSAGE = """\
You are a Legal-10 benchmark assistant.

You must treat each message as a separate context window.
Only use information inside the provided windows for this sample.
Do not use prior knowledge, training data, or previous samples.

Output must follow the RESPONSE CONTRACT exactly. No extra text.
If required information is missing, output exactly: INSUFFICIENT_INFO"""

# ---------------------------------------------------------------------------
# Build functions
# ---------------------------------------------------------------------------


def _write_json(path: Path, data: dict | list) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")


def build_benchmark_json(out: Path) -> None:
    data = {
        "benchmark_id": "legal10_3step_v1",
        "benchmark_name": "Legal-10 (3-step MVP)",
        "version": "1.0.0",
        "description": "KA-SC + IRAC (closed-book) + IRAC (open-book with RP) with sealed bundle inputs",
        "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "step_count": 3,
        "payload_count": 2,
        "system_message": SYSTEM_MESSAGE,
    }
    _write_json(out / "benchmark" / "benchmark.json", data)


def build_plan_json(out: Path) -> None:
    data = {
        "plan_id": "legal10_3step_v1_plan",
        "plan_version": "1.0.0",
        "benchmark_id": "legal10_3step_v1",
        "steps": [
            {
                "step_id": "d1",
                "step_file": "model_steps/d1.json",
                "scoring": "deterministic",
                "scorer_ref": "score_d1_known_authority_v1",
                "output_contract": "ka_sc_v1",
                "inject_payloads": ["p1"],
            },
            {
                "step_id": "d2",
                "step_file": "model_steps/d2.json",
                "scoring": "judge",
                "judge_prompt_file": "judge_prompts/irac_mee_pair_v1.json",
                "output_contract": "irac_v1",
                "inject_payloads": ["p1"],
            },
            {
                "step_id": "j3",
                "step_file": "model_steps/j3.json",
                "scoring": "judge",
                "judge_prompt_file": "judge_prompts/irac_mee_pair_v1.json",
                "output_contract": "irac_v1",
                "inject_payloads": ["p1", "p2"],
                "judge_grades_step_ids": ["d2", "j3"],
            },
        ],
    }
    _write_json(out / "benchmark" / "plan.json", data)


def build_model_step(out: Path, step_id: str, step_name: str, prompt_template: str,
                     output_contract: str, placeholders: list[str],
                     output_schema: dict) -> None:
    data = {
        "step_id": step_id,
        "step_name": step_name,
        "prompt_template": prompt_template,
        "output_contract": output_contract,
        "placeholders": placeholders,
        "output_schema": output_schema,
    }
    _write_json(out / "benchmark" / "model_steps" / f"{step_id}.json", data)


def build_judge_prompt(out: Path) -> None:
    data = {
        "prompt_id": "irac_mee_pair_v1",
        "prompt_template": JUDGE_PROMPT_TEMPLATE,
        "output_contract": "irac_mee_pair_v1",
        "placeholders": [
            "STEP_IRAC_CLOSED_ID",
            "STEP_IRAC_OPEN_ID",
            "CLOSED_issue",
            "CLOSED_rule",
            "CLOSED_application",
            "CLOSED_conclusion",
            "OPEN_issue",
            "OPEN_rule",
            "OPEN_application",
            "OPEN_conclusion",
        ],
        "output_schema": {
            "type": "object",
            "required": ["schema_version", "grades"],
            "properties": {
                "schema_version": {"const": "irac_mee_pair_v1"},
                "grades": {
                    "type": "object",
                    "description": "Keys are step IDs (e.g. 'd2', 'j3')",
                    "additionalProperties": {
                        "type": "object",
                        "required": ["mode", "issue_score", "rule_score", "application_score", "conclusion_score", "reasoning"],
                        "properties": {
                            "mode": {"enum": ["closed-book", "open-book"]},
                            "issue_score": {"type": "integer", "minimum": 0, "maximum": 6},
                            "rule_score": {"type": "integer", "minimum": 0, "maximum": 6},
                            "application_score": {"type": "integer", "minimum": 0, "maximum": 6},
                            "conclusion_score": {"type": "integer", "minimum": 0, "maximum": 6},
                            "reasoning": {"type": "string"},
                        },
                    },
                },
            },
        },
    }
    _write_json(out / "benchmark" / "judge_prompts" / "irac_mee_pair_v1.json", data)


def build_all(out: Path) -> None:
    print(f"Building benchmark packet -> {out / 'benchmark'}")

    build_benchmark_json(out)
    build_plan_json(out)

    # d1: Known Authority (KA-SC)
    build_model_step(
        out,
        step_id="d1",
        step_name="Known Authority (SCOTUS)",
        prompt_template=D1_PROMPT_TEMPLATE,
        output_contract="ka_sc_v1",
        placeholders=["anchor_text"],
        output_schema={
            "type": "object",
            "required": ["controlling_authority", "in_favor", "against", "most_frequent"],
            "properties": {
                "controlling_authority": {"type": "string"},
                "in_favor": {"type": "array", "items": {"type": "string"}},
                "against": {"type": "array", "items": {"type": "string"}},
                "most_frequent": {"type": "string"},
            },
        },
    )

    # d2: IRAC without RP (closed-book)
    build_model_step(
        out,
        step_id="d2",
        step_name="IRAC (Closed-Book)",
        prompt_template=D2_PROMPT_TEMPLATE,
        output_contract="irac_v1",
        placeholders=["anchor_us_cite", "anchor_case_name", "anchor_term", "anchor_text"],
        output_schema={
            "type": "object",
            "required": ["issue", "rule", "application", "conclusion", "citations"],
            "properties": {
                "issue": {"type": "string"},
                "rule": {"type": "string"},
                "application": {"type": "string"},
                "conclusion": {"type": "string"},
                "citations": {"type": "array", "items": {"type": "string"}},
            },
        },
    )

    # j3: IRAC with RP (open-book)
    build_model_step(
        out,
        step_id="j3",
        step_name="IRAC (Open-Book with Research Pack)",
        prompt_template=J3_PROMPT_TEMPLATE,
        output_contract="irac_v1",
        placeholders=["anchor_us_cite", "anchor_case_name", "anchor_term", "anchor_text", "research_pack_content"],
        output_schema={
            "type": "object",
            "required": ["issue", "rule", "application", "conclusion", "citations"],
            "properties": {
                "issue": {"type": "string"},
                "rule": {"type": "string"},
                "application": {"type": "string"},
                "conclusion": {"type": "string"},
                "citations": {"type": "array", "items": {"type": "string"}},
            },
        },
    )

    # Judge prompt
    build_judge_prompt(out)

    # Verify
    expected = [
        "benchmark/benchmark.json",
        "benchmark/plan.json",
        "benchmark/model_steps/d1.json",
        "benchmark/model_steps/d2.json",
        "benchmark/model_steps/j3.json",
        "benchmark/judge_prompts/irac_mee_pair_v1.json",
    ]
    for rel in expected:
        p = out / rel
        if not p.exists():
            raise RuntimeError(f"Missing expected file: {p}")
        print(f"  OK  {rel}  ({p.stat().st_size} bytes)")

    print("Benchmark packet built successfully.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Legal-10 3-Step Benchmark Builder")
    parser.add_argument("--out", type=Path, required=True, help="Bundle root directory")
    args = parser.parse_args()
    build_all(args.out)


if __name__ == "__main__":
    main()
