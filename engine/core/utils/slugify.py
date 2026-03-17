from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\Slugify.java
# WARNING: Unresolved types: Pattern

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class Slugify:
    nonlatin: ClassVar[Pattern]
    whitespace: ClassVar[Pattern]
    dash_pattern: ClassVar[Pattern]

    @staticmethod
    def of(input: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_start_case(input: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
