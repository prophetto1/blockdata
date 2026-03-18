from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\PathUtil.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class PathUtil:

    @staticmethod
    def check_leading_slash(path: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
