from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\controllers\domain\IdWithNamespace.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class IdWithNamespace:
    namespace: str | None = None
    id: str | None = None
