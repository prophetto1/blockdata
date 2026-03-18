from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\test\flow\UnitTest.java

from dataclasses import dataclass
from typing import Any

from engine.core.test.flow.assertion import Assertion
from engine.core.test.flow.fixtures import Fixtures


@dataclass(slots=True, kw_only=True)
class UnitTest:
    id: str
    type: str
    assertions: list[Assertion]
    disabled: bool = False
    description: str | None = None
    fixtures: Fixtures | None = None
