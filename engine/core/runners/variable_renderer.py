from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\VariableRenderer.java
# WARNING: Unresolved types: ApplicationContext, Exception, Matcher, Pattern, PebbleEngine, PebbleException

from dataclasses import dataclass, field
from typing import Any, ClassVar, Optional

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.pebble.pebble_engine_factory import PebbleEngineFactory


@dataclass(slots=True, kw_only=True)
class VariableRenderer:
    r_a_w__p_a_t_t_e_r_n: ClassVar[Pattern] = Pattern.compile("(\\{%-*\\s*raw\\s*-*%}(.*?)\\{%-*\\s*endraw\\s*-*%})")
    m_a_x__r_e_n_d_e_r_i_n_g__a_m_o_u_n_t: ClassVar[int] = 100
    pebble_engine: PebbleEngine | None = None
    variable_configuration: VariableConfiguration | None = None

    @staticmethod
    def proper_pebble_exception(initial_extension: PebbleException) -> IllegalVariableEvaluationException:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, inline: str, variables: dict[str, Any]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def render_typed(self, inline: str, variables: dict[str, Any]) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, inline: str, variables: dict[str, Any], recursive: bool) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, inline: Any, variables: dict[str, Any], recursive: bool, stringify: bool) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def render_once(self, inline: Any, variables: dict[str, Any], stringify: bool) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def alternative_render(self, e: Exception, inline: str, variables: dict[str, Any]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def put_back_raw_tags(replacers: dict[str, str], result: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def replace_raw_tags(raw_matcher: Matcher, replacers: dict[str, str]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def render_recursively(self, inline: Any, variables: dict[str, Any], stringify: bool) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def render_recursively(self, rendering_count: int, inline: Any, variables: dict[str, Any], stringify: bool) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, in: dict[str, Any], variables: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, in: dict[str, Any], variables: dict[str, Any], recursive: bool) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def render_object(self, object: Any, variables: dict[str, Any]) -> Optional[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def render_object(self, object: Any, variables: dict[str, Any], recursive: bool) -> Optional[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def render_list(self, list: list[Any], variables: dict[str, Any]) -> list[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def render_list(self, list: list[Any], variables: dict[str, Any], recursive: bool) -> list[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, list: list[str], variables: dict[str, Any]) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, list: list[str], variables: dict[str, Any], recursive: bool) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, set: set[str], variables: dict[str, Any]) -> set[str]:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, list: set[str], variables: dict[str, Any], recursive: bool) -> set[str]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class VariableConfiguration:
        cache_enabled: bool | None = None
        cache_size: int | None = None
        recursive_rendering: bool | None = None
