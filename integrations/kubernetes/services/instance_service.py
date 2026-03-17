from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class InstanceService:
    mapper: ObjectMapper | None = None

    def from_map(self, cls: Class[T], run_context: RunContext, additional_vars: dict[String, Object], map: dict[String, Object]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def from_map(self, cls: Class[T], run_context: RunContext, additional_vars: dict[String, Object], map: dict[String, Object], defaults: dict[String, Object]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, run_context: RunContext, additional_vars: dict[String, Object], map: dict[Object, Object]) -> dict[Object, Object]:
        raise NotImplementedError  # TODO: translate from Java

    def render(self, run_context: RunContext, additional_vars: dict[String, Object], list: list) -> list:
        raise NotImplementedError  # TODO: translate from Java

    def render_var(self, run_context: RunContext, additional_vars: dict[String, Object], value: Any) -> Any:
        raise NotImplementedError  # TODO: translate from Java
