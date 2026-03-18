from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\RunContextProperty.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar, Optional

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class RunContextProperty:
    logger: ClassVar[Logger] = getLogger(__name__)
    property: Property[T] | None = None
    run_context: RunContext | None = None
    task: Task | None = None
    trigger: AbstractTrigger | None = None
    skip_cache: bool | None = None

    def validate(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def skip_cache(self) -> RunContextProperty[T]:
        raise NotImplementedError  # TODO: translate from Java

    def as(self, clazz: type[T], variables: dict[str, Any] | None = None) -> Optional[T]:
        raise NotImplementedError  # TODO: translate from Java

    def as_list(self, item_clazz: type[I], variables: dict[str, Any] | None = None) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def as_map(self, key_class: type[K], value_class: type[V], variables: dict[str, Any] | None = None) -> T:
        raise NotImplementedError  # TODO: translate from Java
