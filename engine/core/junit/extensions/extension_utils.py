from __future__ import annotations

# Source: E:\KESTRA\tests\src\main\java\io\kestra\core\junit\extensions\ExtensionUtils.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class ExtensionUtils:

    @staticmethod
    def load_file(path: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
