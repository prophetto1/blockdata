from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dbt\src\main\java\io\kestra\plugin\dbt\cli\AbstractRun.java
# WARNING: Unresolved types: java, util

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.dbt.cli.abstract_dbt import AbstractDbt
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractRun(ABC, AbstractDbt):
    full_refresh: Property[bool] = Property.ofValue(Boolean.FALSE)
    thread: Property[int] | None = None
    target: Property[str] | None = None
    selector: Property[str] | None = None
    select: Property[list[str]] | None = None
    exclude: Property[list[str]] | None = None

    @abstractmethod
    def dbt_command(self) -> str:
        ...

    def dbt_commands(self, run_context: RunContext) -> java.util.List[str]:
        raise NotImplementedError  # TODO: translate from Java
