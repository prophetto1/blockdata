"""S8: Citation Integrity.

Strict adherence to Article III:
- Implements resolve_prompt (trivial for deterministic step)
- Returns (text, obj, meta)
"""

from typing import Any

from chain.steps.base import Step
from chain.scoring.citation_verify import (
    extract_citations,
    verify_all_citations,
    build_canonical_sets,
)
from core.runtime.chain import ChainContext


class S8CitationIntegrity(Step):
    """S8: Citation Integrity - verification gate."""

    def __init__(
        self,
        fake_us_cites: set[str] | None = None,
        scdb_us_cites: set[str] | dict[str, object] | None = None,
    ) -> None:
        self._fake_us_cites = fake_us_cites or set()
        self._scdb_us_cites = scdb_us_cites or set()
        self._s7_text = ""

        if fake_us_cites and scdb_us_cites:
            self._canonical_fake, self._canonical_scdb = build_canonical_sets(
                self._fake_us_cites, self._scdb_us_cites
            )
        else:
            self._canonical_fake = set()
            self._canonical_scdb = set()

    def set_verification_sets(
        self,
        fake_us_cites: set[str],
        scdb_us_cites: set[str] | dict[str, object],
    ) -> None:
        self._fake_us_cites = fake_us_cites
        self._scdb_us_cites = scdb_us_cites
        self._canonical_fake, self._canonical_scdb = build_canonical_sets(
            fake_us_cites, scdb_us_cites
        )

    @property
    def step_id(self) -> str:
        return "s8"

    @property
    def step_name(self) -> str:
        return "s8"

    def requires(self) -> set[str]:
        return {"s7"}

    def check_coverage(self, ctx: ChainContext) -> bool:
        return "research_pack" in ctx.data and ctx.data["research_pack"] is not None

    def prompt(self, ctx: ChainContext) -> tuple[str, Any, dict]:
        """S8 doesn't use LLM - return verification context."""
        s7_result = ctx.get("s7")
        if s7_result is None:
            self._s7_text = ""
            msg = "[S8: No S7 output available]"
        else:
            parsed = s7_result.parsed
            text_parts = [
                parsed.get("issue", ""),
                parsed.get("rule", ""),
                parsed.get("application", ""),
                parsed.get("conclusion", ""),
            ]
            combined_text = "\n".join(text_parts)
            self._s7_text = combined_text
            msg = f"[S8: Verify citations in S7 output]\n\n{combined_text}"

        # S8 is deterministic, so we return a dummy resolve_prompt structure
        return (msg, None, {"type": "deterministic", "step": "s8"})

    def parse(self, raw_response: str) -> dict[str, Any]:
        """Parse S8 - run verification on stored S7 text."""
        if not self._s7_text:
            return {
                "citations_found": [],
                "all_valid": False,
                "errors": ["No S7 text available"],
            }

        return self.execute_verification(self._s7_text)

    def execute_verification(self, s6_text: str) -> dict[str, Any]:
        citations = extract_citations(s6_text)
        if not citations:
            return {
                "citations_found": [],
                "all_valid": False,
                "errors": ["No literal U.S. Reports citations found in S7 output text"],
            }
        results, all_valid = verify_all_citations(
            citations, self._canonical_fake, self._canonical_scdb
        )
        citations_found = [
            {
                "cite": r.cite,
                "canonical": r.canonical,
                "exists": r.exists,
                "is_fake": r.is_fake,
                "in_scdb": r.in_scdb,
            }
            for r in results
        ]
        return {
            "citations_found": citations_found,
            "all_valid": all_valid,
        }

    def ground_truth(self, ctx: ChainContext) -> dict[str, Any]:
        return {"all_valid": True}

    def score(
        self, parsed: dict[str, Any], ground_truth: dict[str, Any]
    ) -> tuple[float, bool]:
        all_valid = parsed.get("all_valid", False)
        if all_valid:
            return (1.0, True)
        else:
            return (0.0, False)

    def create_result_from_verification(self, ctx: ChainContext, model: str = "deterministic"):
        # Helper logic preserved for executor convenience
        s7_result = ctx.get("s7")
        if s7_result is None:
            return self.create_result(
                prompt="",
                raw_response="",
                parsed={"citations_found": [], "all_valid": False, "errors": ["No S7 output"]},
                ground_truth=self.ground_truth(ctx),
                score=0.0,
                correct=False,
                model=model,
            )

        s7_parsed = s7_result.parsed
        text_parts = [
            s7_parsed.get("issue", ""),
            s7_parsed.get("rule", ""),
            s7_parsed.get("application", ""),
            s7_parsed.get("conclusion", ""),
        ]
        s7_text = "\n".join(text_parts)
        parsed = self.execute_verification(s7_text)
        gt = self.ground_truth(ctx)
        score_val, correct = self.score(parsed, gt)

        return self.create_result(
            prompt=f"[S8: Verify citations in S7 output]\n\n{s7_text}",
            raw_response="[Deterministic verification - no LLM call]",
            parsed=parsed,
            ground_truth=gt,
            score=score_val,
            correct=correct,
            model=model,
        )
