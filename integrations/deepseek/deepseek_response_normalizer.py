from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class DeepseekResponseNormalizer:
    m_a_p_p_e_r: ObjectMapper | None = None

    def normalize(self, content: str, maybe_schema: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
