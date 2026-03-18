from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\functions\NanoIDFunction.java
# WARNING: Unresolved types: SecureRandom

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class NanoIDFunction:
    default_alphabet: ClassVar[list[str]]
    secure_random: ClassVar[SecureRandom]
    default_length: ClassVar[int] = 21
    length: ClassVar[str] = "length"
    alphabet: ClassVar[str] = "alphabet"
    max_length: ClassVar[int] = 1000

    def execute(self, args: dict[str, Any], self: PebbleTemplate, context: EvaluationContext, line_number: int) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def parse_length(args: dict[str, Any], self: PebbleTemplate, line_number: int) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def get_argument_names(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def create_nano_id(self, length: int, alphabet: list[str]) -> str:
        raise NotImplementedError  # TODO: translate from Java
