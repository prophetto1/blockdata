from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-deepseek\src\main\java\io\kestra\plugin\deepseek\DeepseekResponseNormalizer.java
# WARNING: Unresolved types: ObjectMapper

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class DeepseekResponseNormalizer:
    m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson()

    @staticmethod
    def normalize(content: str, maybe_schema: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
