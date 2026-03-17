from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\property\Data.java

from dataclasses import dataclass, field
from typing import Any, Callable, ClassVar, Protocol

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Data:
    map_of_string_object: ClassVar[type[dict[str, Any]]]
    json_mapper: ClassVar[ObjectMapper]
    from: Any | None = None

    @staticmethod
    def from(from: Any) -> Data:
        raise NotImplementedError  # TODO: translate from Java

    def read(self, run_context: RunContext) -> Flux[dict[str, Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def read_as(self, run_context: RunContext, clazz: type[T], mapper: Callable[dict[str, Any], T]) -> Flux[T]:
        raise NotImplementedError  # TODO: translate from Java

    class From(Protocol):
        def get_from(self) -> Any: ...
