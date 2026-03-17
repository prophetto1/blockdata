from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\executions\ExecutionTrigger.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.tasks.output import Output


@dataclass(slots=True, kw_only=True)
class ExecutionTrigger:
    id: str
    type: str
    variables: dict[str, Any] | None = None
    log_file: str | None = None

    @staticmethod
    def of(abstract_trigger: AbstractTrigger, output: Output) -> ExecutionTrigger:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(abstract_trigger: AbstractTrigger, output: Output, log_file: str) -> ExecutionTrigger:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(abstract_trigger: AbstractTrigger, variables: dict[str, Any]) -> ExecutionTrigger:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def of(abstract_trigger: AbstractTrigger, variables: dict[str, Any], log_file: str) -> ExecutionTrigger:
        raise NotImplementedError  # TODO: translate from Java
