from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kubernetes\src\main\java\io\kestra\plugin\kubernetes\services\InstanceService.java
# WARNING: Unresolved types: Class, IOException, ObjectMapper, T

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class InstanceService(ABC):
    mapper: ClassVar[ObjectMapper] = JacksonMapper.ofYaml()

    @staticmethod
    def from_map(cls: Class[T], run_context: RunContext, additional_vars: dict[str, Any], map: dict[str, Any]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from_map(cls: Class[T], run_context: RunContext, additional_vars: dict[str, Any], map: dict[str, Any], defaults: dict[str, Any]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def render(run_context: RunContext, additional_vars: dict[str, Any], map: dict[Any, Any]) -> dict[Any, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def render(run_context: RunContext, additional_vars: dict[str, Any], list: list) -> list:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def render_var(run_context: RunContext, additional_vars: dict[str, Any], value: Any) -> Any:
        raise NotImplementedError  # TODO: translate from Java
