from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.dbt.cli.abstract_dbt import AbstractDbt
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractRun(AbstractDbt):
    thread: Property[int] | None = None
    full_refresh: Property[bool] | None = None
    target: Property[str] | None = None
    selector: Property[str] | None = None
    select: Property[list[String]] | None = None
    exclude: Property[list[String]] | None = None

    def dbt_command(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def dbt_commands(self, run_context: RunContext) -> java:
        raise NotImplementedError  # TODO: translate from Java
