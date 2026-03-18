from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\purge\PurgeTask.java

from typing import Any, Protocol

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


class PurgeTask(Protocol):
    def get_namespaces(self) -> Property[list[str]]: ...

    def get_namespace_pattern(self) -> Property[str]: ...

    def get_include_child_namespaces(self) -> Property[bool]: ...

    def filter_pattern(self) -> Property[str]: ...

    def filter_target_extractor(self, item: T) -> str: ...

    def find_namespaces(self, run_context: RunContext) -> list[str]: ...

    def filter_items(self, run_context: RunContext, items: list[T]) -> list[T]: ...
