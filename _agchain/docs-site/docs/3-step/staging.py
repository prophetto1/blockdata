"""Staging: per-step isolation directories.

Creates staging/{run_id}/{call_id}/ with only admitted files:
  - current step file
  - admitted payloads
  - candidate_state.json
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any


def create_staging(runs_dir: Path, run_id: str, call_id: str) -> Path:
    """Create an isolated staging directory for one model call."""
    staging = runs_dir / run_id / "staging" / call_id
    staging.mkdir(parents=True, exist_ok=True)
    return staging


def stage_files(
    staging_dir: Path,
    step_def: dict[str, Any],
    payloads: dict[str, dict[str, Any]],
    candidate_state: dict[str, Any],
) -> list[Path]:
    """Copy only admitted files into the staging directory. Returns list of staged paths."""
    staged: list[Path] = []

    # Stage step definition
    step_path = staging_dir / "step.json"
    step_path.write_text(json.dumps(step_def, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    staged.append(step_path)

    # Stage admitted payloads
    for payload_id, payload_data in payloads.items():
        p = staging_dir / f"{payload_id}.json"
        p.write_text(json.dumps(payload_data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        staged.append(p)

    # Stage candidate state
    state_path = staging_dir / "candidate_state.json"
    state_path.write_text(json.dumps(candidate_state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    staged.append(state_path)

    return staged


def cleanup_staging(staging_dir: Path) -> None:
    """Remove staging directory after use."""
    if staging_dir.exists():
        shutil.rmtree(staging_dir)
