"""S4: Fact Extraction.

Strict adherence to Article III:
- Implements resolve_prompt
- Returns (text, obj, meta)
"""

import json
from typing import Any

from chain.steps.base import Step
from core.runtime.chain import ChainContext
from core.runtime.ground_truth import (
    PARTY_WINNING_CODES,
    V2_DISPOSITION_ENUM,
    disposition_code_to_v2,
    party_winning_code_to_text,
)

# Valid disposition values (v2.0.0 - 9 values)
VALID_DISPOSITIONS = V2_DISPOSITION_ENUM

# Valid party_winning values
VALID_PARTY_WINNING = frozenset(PARTY_WINNING_CODES.values())

# Prompt template for S4 v2.0.0
S4_PROMPT_TEMPLATE = """You are a legal research assistant. Read the following Supreme Court opinion and extract:

1. The disposition of the case (how the Court ruled)
2. Which party won (petitioner, respondent, or unclear)
3. A brief summary of the holding
4. Direct quotes from the opinion supporting your answers

OPINION:
{opinion_text}

DISPOSITION must be exactly one of these values:
- "affirmed"
- "reversed"
- "reversed and remanded"
- "vacated"
- "vacated and remanded"
- "affirmed and reversed in part"
- "affirmed and reversed in part and remanded"
- "dismissed"
- "other"

PARTY_WINNING must be exactly one of:
- "petitioner"
- "respondent"
- "unclear"

Return a JSON object with these fields:
- "disposition": The disposition (from the list above)
- "party_winning": Which party won (from the list above)
- "holding_summary": A 1-2 sentence summary of the holding
- "evidence_quotes": An array of direct quotes from the opinion supporting your disposition and party_winning answers

Return a single JSON object matching the schema exactly.
No extra keys. No surrounding text. No markdown code fences."""


class S4FactExtraction(Step):
    """S4: Fact Extraction - extract disposition, party_winning, holding."""

    @property
    def step_id(self) -> str:
        return "s4"

    @property
    def step_name(self) -> str:
        return "s4"

    def requires(self) -> set[str]:
        """S4 requires S1 (known authority identification)."""
        return {"s1"}

    def check_coverage(self, ctx: ChainContext) -> bool:
        """S4 requires cited_case text (Tier A)."""
        return ctx.instance.has_cited_text

    def prompt(self, ctx: ChainContext) -> tuple[str, Any, dict]:
        """Build S4 prompt with opinion text."""
        opinion = ctx.instance.cited_case.majority_opinion or ""
        # Truncate very long opinions
        max_chars = 50000
        if len(opinion) > max_chars:
            opinion = opinion[:max_chars] + "\n\n[TRUNCATED]"

        from core.prompts.resolver import resolve_prompt

        return resolve_prompt(
            name=self.step_id,
            variables={"opinion_text": opinion},
            fallback=S4_PROMPT_TEMPLATE,
        )

    def parse(self, raw_response: str) -> dict[str, Any]:
        """Parse S4 v2.0.0 response into structured payload."""
        try:
            response = raw_response.strip()

            # Handle markdown code blocks
            if response.startswith("```"):
                lines = response.split("\n")
                json_lines: list[str] = []
                in_block = False
                for line in lines:
                    if line.startswith("```") and not in_block:
                        in_block = True
                        continue
                    elif line.startswith("```") and in_block:
                        break
                    elif in_block:
                        json_lines.append(line)
                response = "\n".join(json_lines)

            data = json.loads(response)

            if not isinstance(data, dict):
                return {"errors": ["Response is not a JSON object"]}

            # Require all keys per v2.0.0 schema
            if "disposition" not in data:
                return {"errors": ["Missing required key: disposition"]}
            if "party_winning" not in data:
                return {"errors": ["Missing required key: party_winning"]}
            if "evidence_quotes" not in data:
                return {"errors": ["Missing required key: evidence_quotes"]}

            disposition = data["disposition"]
            party_winning = data["party_winning"]
            holding_summary = data.get("holding_summary", "")
            evidence_quotes_raw = data["evidence_quotes"]

            # Normalize to lowercase for comparison
            if isinstance(disposition, str):
                disposition = disposition.lower().strip()
            else:
                return {"errors": ["disposition must be a string"]}
            if isinstance(party_winning, str):
                party_winning = party_winning.lower().strip()
            else:
                return {"errors": ["party_winning must be a string"]}

            # Validate disposition against v2.0.0 closed enum
            if disposition not in VALID_DISPOSITIONS:
                return {"errors": [f"Invalid disposition: '{disposition}' not in v2.0.0 enum"]}

            # Validate party_winning against closed enum
            if party_winning not in VALID_PARTY_WINNING:
                return {"errors": [f"Invalid party_winning: '{party_winning}' not in enum"]}

            # Handle evidence_quotes
            if isinstance(evidence_quotes_raw, str):
                evidence_quotes: list[str] = [evidence_quotes_raw.strip()] if evidence_quotes_raw.strip() else []
            elif isinstance(evidence_quotes_raw, list):
                evidence_quotes = [
                    q.strip() for q in evidence_quotes_raw
                    if isinstance(q, str) and q.strip()
                ]
            else:
                return {"errors": ["evidence_quotes must be a string or a list of strings"]}

            return {
                "disposition": disposition,
                "party_winning": party_winning,
                "holding_summary": str(holding_summary) if holding_summary else "",
                "evidence_quotes": evidence_quotes,
            }

        except json.JSONDecodeError as e:
            return {"errors": [f"JSON parse error: {e}"]}

    def ground_truth(self, ctx: ChainContext) -> dict[str, Any]:
        """Get ground truth from cited_case SCDB metadata (v2.0.0)."""
        cited = ctx.instance.cited_case
        disposition = disposition_code_to_v2(cited.case_disposition)
        party_winning = party_winning_code_to_text(cited.party_winning)

        return {
            "disposition": disposition,
            "party_winning": party_winning,
            "disposition_code": cited.case_disposition,
            "party_winning_code": cited.party_winning,
        }

    def score(
        self, parsed: dict[str, Any], ground_truth: dict[str, Any]
    ) -> tuple[float, bool]:
        """Score S4 output against ground truth."""
        if "errors" in parsed:
            return (0.0, False)

        pred_disposition = parsed.get("disposition", "")
        pred_party = parsed.get("party_winning", "")

        true_disposition = ground_truth.get("disposition", "")
        true_party = ground_truth.get("party_winning", "")

        if true_disposition is None:
            true_disposition = ""
        if true_party is None:
            true_party = ""

        disposition_match = pred_disposition == true_disposition.lower()
        party_match = pred_party == true_party.lower()

        if disposition_match and party_match:
            return (1.0, True)
        elif disposition_match or party_match:
            return (0.5, False)
        else:
            return (0.0, False)
