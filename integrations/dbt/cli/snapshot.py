from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dbt\src\main\java\io\kestra\plugin\dbt\cli\Snapshot.java

from dataclasses import dataclass
from typing import Any

from integrations.dbt.cli.abstract_run import AbstractRun


@dataclass(slots=True, kw_only=True)
class Snapshot(AbstractRun):
    """Invoke dbt snapshot command (Deprecated)."""

    def dbt_command(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
