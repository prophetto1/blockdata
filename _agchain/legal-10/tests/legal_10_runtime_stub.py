"""Minimal stubs for registry tests that need runtime callables."""
from __future__ import annotations
import sys
from pathlib import Path

# Add the 3-STEP-RUN directory to path
_run_dir = Path(__file__).resolve().parents[1] / "runspecs" / "3-STEP-RUN"
sys.path.insert(0, str(_run_dir))

from runtime.input_assembler import build_messages  # noqa: F401
from runtime.state import CandidateState  # noqa: F401
