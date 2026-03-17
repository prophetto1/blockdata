from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dbt\src\main\java\io\kestra\plugin\dbt\cli\LogService.java
# WARNING: Unresolved types: AtomicBoolean, ObjectMapper

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class LogService:
    m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson()
        .setSerializationInclusion(JsonInclude.Include.NON_NULL)

    @staticmethod
    def parse(run_context: RunContext, line: str, has_warning: AtomicBoolean) -> None:
        raise NotImplementedError  # TODO: translate from Java
