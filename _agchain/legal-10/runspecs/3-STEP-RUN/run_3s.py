"""Legal-10 3-Step Runner (Direct API, Replay_Minimal session strategy).

Executes the 3-step chain for each EU:
  d1 (KA-SC) -> d2 (IRAC closed-book) -> j3 (IRAC open-book)
  + judge call (grades both IRACs)
  + citation integrity (deterministic post-check)

Usage:
  python run_3s.py --benchmark-dir runspecs/3-STEP-RUN/benchmark --eu-dir datasets/eus/legal10_3step_v1/eus/eu__1826-018 --runs-dir runs --provider openai --model gpt-4o
  python run_3s.py --benchmark-dir runspecs/3-STEP-RUN/benchmark --eu-root datasets/eus/legal10_3step_v1/eus --runs-dir runs --provider anthropic --model claude-sonnet-4-5-20250929 [--limit N]
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Load .env from repo root (E:\agchain\.env)
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
_ENV_FILE = _REPO_ROOT / ".env"
if _ENV_FILE.exists():
    for _line in _ENV_FILE.read_text(encoding="utf-8").splitlines():
        if "=" in _line and not _line.startswith("#"):
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip())

# Ensure the runspec root is on sys.path for imports
_RUNSPEC_ROOT = Path(__file__).resolve().parent
if str(_RUNSPEC_ROOT) not in sys.path:
    sys.path.insert(0, str(_RUNSPEC_ROOT))

from runtime.payload_gate import get_admitted_payloads
from runtime.input_assembler import build_messages
from runtime.staging import create_staging, stage_files, cleanup_staging
from runtime.audit import hash_file, hash_bytes, emit_audit_record, emit_run_record
from runtime.state import CandidateState
from runtime.execution_backend import ExecutionBackend, resolve_backend
from runtime.execution_result import ExecutionResult
from scorers.d1_known_authority_scorer import score_d1_known_authority
from scorers.citation_integrity import score_citation_integrity
from adapters.model_adapter import create_adapter, ModelAdapter


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _parse_model_json(raw: str) -> dict[str, Any] | None:
    """Extract and parse JSON from model response, tolerating markdown fences."""
    text = raw.strip()
    # Strip markdown fences if present
    m = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL)
    if m:
        text = m.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def _resolve_model_name(provider: str, model: str | None) -> str:
    if model:
        return model
    if provider == "openai":
        return "gpt-4o"
    if provider == "anthropic":
        return "claude-sonnet-4-5-20250929"
    raise ValueError(f"Unknown provider: {provider}")


def _execution_metadata(result: ExecutionResult) -> dict[str, Any]:
    return {
        "backend": result.backend,
        "provider": result.provider,
        "model_name": result.model_name,
        "usage": result.usage,
        "timing_ms": result.timing_ms,
    }


# ---------------------------------------------------------------------------
# Judge call
# ---------------------------------------------------------------------------

async def run_judge_call(
    *,
    judge_backend: ExecutionBackend,
    judge_prompt_def: dict[str, Any],
    d2_output: dict[str, Any],
    j3_output: dict[str, Any],
    closed_step_id: str,
    open_step_id: str,
    system_message: str,
) -> dict[str, Any]:
    """Call the judge model to grade both IRACs. Returns raw + parsed result."""
    template = judge_prompt_def["prompt_template"]

    # Resolve placeholders
    resolved = template
    resolved = resolved.replace("{STEP_IRAC_CLOSED_ID}", closed_step_id)
    resolved = resolved.replace("{STEP_IRAC_OPEN_ID}", open_step_id)
    resolved = resolved.replace("{CLOSED_issue}", d2_output.get("issue", ""))
    resolved = resolved.replace("{CLOSED_rule}", d2_output.get("rule", ""))
    resolved = resolved.replace("{CLOSED_application}", d2_output.get("application", ""))
    resolved = resolved.replace("{CLOSED_conclusion}", d2_output.get("conclusion", ""))
    resolved = resolved.replace("{OPEN_issue}", j3_output.get("issue", ""))
    resolved = resolved.replace("{OPEN_rule}", j3_output.get("rule", ""))
    resolved = resolved.replace("{OPEN_application}", j3_output.get("application", ""))
    resolved = resolved.replace("{OPEN_conclusion}", j3_output.get("conclusion", ""))

    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": resolved},
    ]

    result = await judge_backend.execute(messages, temperature=0.0, max_tokens=2048)
    raw_response = result.response_text
    parsed = _parse_model_json(raw_response)

    # Compute totals
    computed: dict[str, Any] = {}
    if parsed and "grades" in parsed:
        for sid, grade in parsed["grades"].items():
            total_raw = sum(grade.get(k, 0) for k in ("issue_score", "rule_score", "application_score", "conclusion_score"))
            computed[sid] = {
                "total_raw": total_raw,
                "total_normalized": round(total_raw / 24.0, 7),
            }

    return {
        "raw_response": raw_response,
        "parsed": parsed,
        "computed": computed,
        "model_name": result.model_name,
        "execution_metadata": _execution_metadata(result),
    }


# ---------------------------------------------------------------------------
# Single EU execution
# ---------------------------------------------------------------------------

async def run_single_eu(
    *,
    benchmark_dir: Path,
    eu_dir: Path,
    runs_dir: Path,
    eval_backend: ExecutionBackend,
    judge_backend: ExecutionBackend,
    eval_model_name: str,
    judge_model_name: str,
    execution_backend_name: str,
    run_id: str,
    profile: Any = None,
    build_messages_fn: Any = None,
) -> dict[str, Any]:
    """Execute the 3-step chain for one EU."""
    benchmark = _load_json(benchmark_dir / "benchmark.json")
    plan = _load_json(benchmark_dir / "plan.json")
    ground_truth = _load_json(eu_dir / "ground_truth.json")
    system_message = benchmark.get("system_message", "")

    eu_id = ground_truth.get("eu_id", eu_dir.name)
    run_log = runs_dir / run_id / "run.jsonl"
    audit_log = runs_dir / run_id / "audit_log.jsonl"

    print(f"  Run {run_id} | EU {eu_id}")

    _session = None
    if profile is not None:
        from profiles.registry import resolve_profile
        _resolved = resolve_profile(
            profile,
            build_messages_fn=build_messages_fn,
            candidate_state=CandidateState(),
        )
        state = _resolved.state
        _session = _resolved.session
    else:
        state = CandidateState()
    step_outputs: dict[str, dict[str, Any]] = {}
    step_scores: dict[str, Any] = {}
    resolved_eval_model_name = eval_model_name
    resolved_judge_model_name = judge_model_name

    # Load step definitions
    step_defs: dict[str, dict[str, Any]] = {}
    for step in plan["steps"]:
        step_file = benchmark_dir / step["step_file"]
        step_defs[step["step_id"]] = _load_json(step_file)

    # Execute each step (Replay_Minimal: fresh call per step)
    for step in plan["steps"]:
        step_id = step["step_id"]
        step_def = step_defs[step_id]
        call_id = f"{step_id}_{uuid.uuid4().hex[:8]}"

        print(f"    Step {step_id}...")

        # 1. PayloadGate
        payloads = get_admitted_payloads(step, eu_dir)

        # 2. Staging
        staging_dir = create_staging(runs_dir, run_id, call_id)
        staged_paths = stage_files(staging_dir, step_def, payloads, state.as_dict())

        # 3. InputAssembler
        if _session is not None:
            messages = _session.init_messages(
                step_def=step_def,
                payloads=payloads,
                candidate_state=state.as_dict(),
                system_message=system_message,
            )
        else:
            messages = build_messages(
                step_def=step_def,
                payloads=payloads,
                candidate_state=state.as_dict(),
                system_message=system_message,
            )

        # 4. Audit (pre-call)
        staged_hashes = {p.name: hash_file(p) for p in staged_paths}
        msg_bytes = json.dumps(messages, ensure_ascii=False).encode("utf-8")
        msg_hash = hash_bytes(msg_bytes)

        # 5. Model call
        result = await eval_backend.execute(messages, temperature=0.0, max_tokens=4096)
        raw_response = result.response_text
        resolved_eval_model_name = result.model_name or resolved_eval_model_name

        # 6. Parse + validate
        parsed = _parse_model_json(raw_response)
        parse_failed = parsed is None
        if parse_failed:
            print(f"      WARNING: Failed to parse JSON from model response for {step_id}")
            parsed = {"_raw": raw_response, "_parse_error": True}

        step_outputs[step_id] = parsed

        # 7. Score (deterministic steps); assign score=0 on parse failure
        if step.get("scoring") == "deterministic" and step_id == "d1":
            if parse_failed:
                score_result = {"score": 0.0, "correct": {}, "parse_error": True}
                print(f"      d1 score: 0.000 (parse failure -> score=0)")
            else:
                score_result = score_d1_known_authority(d1_output=parsed, ground_truth=ground_truth)
                print(f"      d1 score: {score_result['score']:.3f} (correct: {score_result['correct']})")
            step_scores["d1"] = score_result

        # 8. Update candidate state (sanitized)
        state.update(step_id, parsed)

        # 9. Write audit + run records
        resp_hash = hash_bytes(raw_response.encode("utf-8"))
        emit_audit_record(
            audit_log,
            run_id=run_id,
            step_id=step_id,
            call_id=call_id,
            staged_files=staged_hashes,
            message_hash=msg_hash,
            response_hash=resp_hash,
            payloads_admitted=list(payloads.keys()),
            message_byte_count=len(msg_bytes),
            ground_truth_accessed=False,
            judge_prompts_accessed=False,
        )

        emit_run_record(run_log, {
            "step_id": step_id,
            "type": "model_call",
            "call_id": call_id,
            "model": resolved_eval_model_name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "raw_response_length": len(raw_response),
            "parsed": parsed if not parsed.get("_parse_error") else None,
            "score": step_scores.get(step_id),
            "execution_metadata": _execution_metadata(result),
        })

        # 10. Cleanup staging
        cleanup_staging(staging_dir)

    # -------------------------------------------------------------------
    # Post-chain: Judge call
    # -------------------------------------------------------------------
    print("    Judge call (grading both IRACs)...")
    d2_output = step_outputs.get("d2", {})
    j3_output = step_outputs.get("j3", {})

    # Find judge prompt file from plan
    judge_prompt_file = None
    judge_step_ids = None
    for step in plan["steps"]:
        if "judge_grades_step_ids" in step:
            judge_prompt_file = step.get("judge_prompt_file")
            judge_step_ids = step["judge_grades_step_ids"]
            break

    if judge_prompt_file:
        judge_prompt_def = _load_json(benchmark_dir / judge_prompt_file)
        closed_id = judge_step_ids[0] if judge_step_ids else "d2"
        open_id = judge_step_ids[1] if judge_step_ids and len(judge_step_ids) > 1 else "j3"

        judge_result = await run_judge_call(
            judge_backend=judge_backend,
            judge_prompt_def=judge_prompt_def,
            d2_output=d2_output,
            j3_output=j3_output,
            closed_step_id=closed_id,
            open_step_id=open_id,
            system_message=system_message,
        )
        resolved_judge_model_name = judge_result["model_name"] or resolved_judge_model_name

        emit_run_record(run_log, {
            "step_id": "judge_irac_pair",
            "type": "judge",
            "grades_step_ids": judge_step_ids,
            "model": resolved_judge_model_name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "raw_response": judge_result["raw_response"],
            "parsed": judge_result["parsed"],
            "computed": judge_result["computed"],
            "execution_metadata": judge_result["execution_metadata"],
        })

        if judge_result["computed"]:
            for sid, comp in judge_result["computed"].items():
                print(f"      Judge {sid}: {comp['total_normalized']:.3f} ({comp['total_raw']}/24)")
        else:
            print("      WARNING: Judge response could not be parsed")

    # -------------------------------------------------------------------
    # Post-chain: Citation integrity (deterministic)
    # -------------------------------------------------------------------
    print("    Citation integrity check...")
    integrity = score_citation_integrity(
        irac_no_rp=d2_output,
        irac_with_rp=j3_output,
        anchor_inventory_full=ground_truth.get("anchor_inventory_full", []),
        rp_subset=ground_truth.get("rp_subset", []),
    )

    emit_run_record(run_log, {
        "step_id": "citation_integrity",
        "type": "deterministic_post",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "result": integrity,
    })

    valid_d9 = integrity["anchor_validity"]["d9"]["valid_count"]
    invalid_d9 = integrity["anchor_validity"]["d9"]["invalid_count"]
    valid_j10 = integrity["anchor_validity"]["j10"]["valid_count"]
    invalid_j10 = integrity["anchor_validity"]["j10"]["invalid_count"]
    print(f"      d2 citations: {valid_d9} valid, {invalid_d9} invalid")
    print(f"      j3 citations: {valid_j10} valid, {invalid_j10} invalid")

    # -------------------------------------------------------------------
    # Final outputs
    # -------------------------------------------------------------------

    # Save candidate state (no GT/scores/judge)
    state.save(runs_dir / run_id / "candidate_state.json")

    # Compute chain_completion and aggregate_score
    completed_steps = [sid for sid in ["d1", "d2", "j3"] if sid in step_outputs and not step_outputs[sid].get("_parse_error")]
    chain_completion = {
        "steps_attempted": len(plan["steps"]),
        "steps_completed": len(completed_steps),
        "completed_step_ids": completed_steps,
        "all_steps_ok": len(completed_steps) == len(plan["steps"]),
    }

    # aggregate_score: weighted average of d1 (deterministic) + judge scores
    score_components: list[float] = []
    d1_score = step_scores.get("d1", {}).get("score")
    if d1_score is not None:
        score_components.append(float(d1_score))
    judge_computed = judge_result.get("computed") if judge_prompt_file else None
    if judge_computed:
        for sid, comp in judge_computed.items():
            score_components.append(float(comp.get("total_normalized", 0.0)))
    aggregate_score = round(sum(score_components) / len(score_components), 7) if score_components else None

    # Summary
    summary = {
        "run_id": run_id,
        "eu_id": eu_id,
        "benchmark_id": benchmark.get("benchmark_id"),
        "eval_model": resolved_eval_model_name,
        "judge_model": resolved_judge_model_name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "aggregate_score": aggregate_score,
        "chain_completion": chain_completion,
        "scores": {
            "d1": step_scores.get("d1", {}).get("score"),
            "judge": judge_computed,
            "citation_integrity": {
                "d2_valid": valid_d9,
                "d2_invalid": invalid_d9,
                "j3_valid": valid_j10,
                "j3_invalid": invalid_j10,
            },
        },
    }

    summary_path = runs_dir / run_id / "summary.json"
    summary_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # Run manifest
    run_dir = runs_dir / run_id
    file_hashes = {}
    for artifact in run_dir.iterdir():
        if artifact.is_file() and artifact.name != "run_manifest.json":
            file_hashes[artifact.name] = hash_file(artifact)

    manifest = {
        "run_id": run_id,
        "eu_id": eu_id,
        "benchmark_dir": str(benchmark_dir),
        "eu_dir": str(eu_dir),
        "eval_model": resolved_eval_model_name,
        "judge_model": resolved_judge_model_name,
        "step_count": len(plan["steps"]),
        "execution_backend": execution_backend_name,
        "session_strategy": "Replay_Minimal",
        "runner_version": "run_3s_v1",
        "file_hashes": file_hashes,
        "reproducibility_key": f"{resolved_eval_model_name}|{resolved_judge_model_name}|temp=0.0|Replay_Minimal",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    manifest_path = runs_dir / run_id / "run_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"    Done. Outputs: {runs_dir / run_id}")
    return summary


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Legal-10 3-Step Runner")
    parser.add_argument("--benchmark-dir", type=Path, required=True, help="Path to benchmark/ directory")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--eu-dir", type=Path, help="Path to a single EU directory")
    group.add_argument("--eu-root", type=Path, help="Root dir containing multiple EU dirs")
    parser.add_argument("--runs-dir", type=Path, default=Path("runs"), help="Output directory for run artifacts")
    parser.add_argument("--provider", required=True, choices=["openai", "anthropic"], help="Model API provider")
    parser.add_argument("--model", type=str, help="Model name (default depends on provider)")
    parser.add_argument("--judge-provider", type=str, help="Judge model provider (defaults to --provider)")
    parser.add_argument("--judge-model", type=str, help="Judge model name (defaults to --model)")
    parser.add_argument("--execution-backend", default="direct", choices=["direct", "inspect"], help="Execution backend")
    parser.add_argument("--limit", type=int, default=0, help="Max EUs to run (0 = all)")
    parser.add_argument(
        "--profile",
        type=str,
        default=None,
        help="Profile ID ('baseline') or path to profile JSON. If omitted, uses legacy code path.",
    )
    args = parser.parse_args()

    if not args.benchmark_dir.exists():
        print(f"ERROR: Benchmark dir not found: {args.benchmark_dir}", file=sys.stderr)
        sys.exit(1)

    # Profile resolution (opt-in)
    _profile_obj = None
    _bm_fn = None
    if args.profile is not None:
        _agchain_root = Path(__file__).resolve().parents[3]
        sys.path.insert(0, str(_agchain_root))

        from profiles.registry import get_baseline_profile
        from profiles.types import Profile
        import profiles.baseline  # noqa: F401 — triggers strategy registration
        from runtime.input_assembler import build_messages as _bm

        _bm_fn = _bm
        if args.profile == "baseline":
            _profile_obj = get_baseline_profile()
        else:
            _profile_obj = Profile.model_validate_json(Path(args.profile).read_text())

    judge_provider = args.judge_provider or args.provider
    eval_model_name = _resolve_model_name(args.provider, args.model)
    judge_model_name = _resolve_model_name(judge_provider, args.judge_model or args.model)

    eval_adapter: ModelAdapter | None = None
    judge_adapter: ModelAdapter | None = None
    if args.execution_backend == "direct":
        eval_adapter = create_adapter(args.provider, model=eval_model_name)
        judge_adapter = create_adapter(judge_provider, model=judge_model_name)

    eval_backend = resolve_backend(
        args.execution_backend,
        provider=args.provider,
        model=eval_model_name,
        adapter=eval_adapter,
    )
    judge_backend = resolve_backend(
        args.execution_backend,
        provider=judge_provider,
        model=judge_model_name,
        adapter=judge_adapter,
    )

    # Collect EU dirs
    eu_dirs: list[Path] = []
    if args.eu_dir:
        if not args.eu_dir.exists():
            print(f"ERROR: EU dir not found: {args.eu_dir}", file=sys.stderr)
            sys.exit(1)
        eu_dirs = [args.eu_dir]
    else:
        if not args.eu_root.exists():
            print(f"ERROR: EU root not found: {args.eu_root}", file=sys.stderr)
            sys.exit(1)
        eu_dirs = sorted([d for d in args.eu_root.iterdir() if d.is_dir() and d.name.startswith("eu__")])

    if args.limit > 0:
        eu_dirs = eu_dirs[:args.limit]

    print(f"Legal-10 3-Step Runner")
    print(f"  Execution backend: {args.execution_backend}")
    print(f"  Eval model: {eval_model_name}")
    print(f"  Judge model: {judge_model_name}")
    print(f"  EUs: {len(eu_dirs)}")
    print()

    async def _run_all() -> None:
        for eu_dir in eu_dirs:
            run_id = f"run_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
            try:
                await run_single_eu(
                    benchmark_dir=args.benchmark_dir,
                    eu_dir=eu_dir,
                    runs_dir=args.runs_dir,
                    eval_backend=eval_backend,
                    judge_backend=judge_backend,
                    eval_model_name=eval_model_name,
                    judge_model_name=judge_model_name,
                    execution_backend_name=args.execution_backend,
                    run_id=run_id,
                    profile=_profile_obj,
                    build_messages_fn=_bm_fn,
                )
            except Exception as e:
                print(f"  ERROR running EU {eu_dir.name}: {e}", file=sys.stderr)
                import traceback

                traceback.print_exc()
            print()

    asyncio.run(_run_all())


if __name__ == "__main__":
    main()
