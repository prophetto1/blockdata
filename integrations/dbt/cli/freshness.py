from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from pathlib import Path

from integrations.dbt.cli.abstract_run import AbstractRun
from engine.core.runners.run_context import RunContext
from engine.plugin.scripts.exec.scripts.models.script_output import ScriptOutput


@dataclass(slots=True, kw_only=True)
class Freshness(AbstractRun):
    """Invoke dbt source freshness command (Deprecated)."""

    def dbt_command(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def parse_results(self, run_context: RunContext, working_directory: Path, script_output: ScriptOutput) -> None:
        raise NotImplementedError  # TODO: translate from Java
