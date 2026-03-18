from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\test\TestSuiteUid.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class TestSuiteUid:
    tenant: str | None = None
    namespace: str | None = None
    id: str | None = None

    def to_string(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
