from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\MathUtils.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class MathUtils:

    @staticmethod
    def round_double(value: float, decimal_places: int) -> float:
        raise NotImplementedError  # TODO: translate from Java
