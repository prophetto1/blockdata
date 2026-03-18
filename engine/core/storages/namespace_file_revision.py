from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\storages\NamespaceFileRevision.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class NamespaceFileRevision:
    revision: int | None = None
