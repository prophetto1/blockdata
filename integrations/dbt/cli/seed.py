from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dbt\src\main\java\io\kestra\plugin\dbt\cli\Seed.java

from dataclasses import dataclass
from typing import Any

from integrations.dbt.cli.abstract_run import AbstractRun


@dataclass(slots=True, kw_only=True)
class Seed(AbstractRun):
    """Invoke dbt seed command (Deprecated)."""

    def dbt_command(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
