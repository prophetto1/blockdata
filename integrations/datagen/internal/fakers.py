from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-datagen\src\main\java\io\kestra\plugin\datagen\internal\Fakers.java
# WARNING: Unresolved types: Faker

from typing import Any, Protocol


class Fakers(Protocol):
    def create(locale: list[str]) -> Faker: ...

    def evaluate(faker: Faker, map: dict[str, Any]) -> dict[str, Any]: ...

    def evaluate(faker: Faker, expression: str) -> str: ...
