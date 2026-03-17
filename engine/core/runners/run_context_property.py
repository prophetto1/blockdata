from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\RunContextProperty.java
# WARNING: Unresolved types: Class, I, K, T, V

from dataclasses import dataclass
from typing import Any, Optional

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class RunContextProperty:
    property: Property[T] | None = None
    run_context: RunContext | None = None
    task: Task | None = None
    trigger: AbstractTrigger | None = None
    skip_cache: bool | None = None

    def validate(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def skip_cache(self) -> RunContextProperty[T]:
        raise NotImplementedError  # TODO: translate from Java

    def as(self, clazz: Class[T]) -> Optional[T]:
        raise NotImplementedError  # TODO: translate from Java

    def as(self, clazz: Class[T], variables: dict[str, Any]) -> Optional[T]:
        raise NotImplementedError  # TODO: translate from Java

    def as_list(self, item_clazz: Class[I]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def as_list(self, item_clazz: Class[I], variables: dict[str, Any]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def as_map(self, key_class: Class[K], value_class: Class[V]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def as_map(self, key_class: Class[K], value_class: Class[V], variables: dict[str, Any]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def get_property(self) -> Property[T]:
        raise NotImplementedError  # TODO: translate from Java
