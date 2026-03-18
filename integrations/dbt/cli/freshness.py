from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dbt\src\main\java\io\kestra\plugin\dbt\cli\Freshness.java

from dataclasses import dataclass
from pathlib import Path
from typing import Any

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
