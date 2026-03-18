from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\VariableRenderer.java
# WARNING: Unresolved types: PebbleEngine

from dataclasses import dataclass, field
from typing import Any, ClassVar, Optional

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.pebble.pebble_engine_factory import PebbleEngineFactory


@dataclass(slots=True, kw_only=True)
class VariableRenderer:
    raw_pattern: ClassVar[re.Pattern]
    max_rendering_amount: ClassVar[int] = 100
    pebble_engine: PebbleEngine | None = None
    variable_configuration: VariableConfiguration | None = None

    @staticmethod
    def proper_pebble_exception(initial_extension: PebbleException) -> IllegalVariableEvaluationException:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, inline: Any, variables: dict[str, Any], recursive: bool | None = None, stringify: bool | None = None) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def render_typed(self, inline: str, variables: dict[str, Any]) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def render_once(self, inline: Any, variables: dict[str, Any], stringify: bool) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def alternative_render(self, e: Exception, inline: str, variables: dict[str, Any]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def put_back_raw_tags(replacers: dict[str, str], result: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def replace_raw_tags(raw_matcher: re.Match, replacers: dict[str, str]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def render_recursively(self, rendering_count: int, inline: Any, variables: dict[str, Any], stringify: bool | None = None) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def render_object(self, object: Any, variables: dict[str, Any], recursive: bool | None = None) -> Optional[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def render_list(self, list: list[Any], variables: dict[str, Any], recursive: bool | None = None) -> list[Any]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class VariableConfiguration:
        cache_enabled: bool | None = None
        cache_size: int | None = None
        recursive_rendering: bool | None = None
