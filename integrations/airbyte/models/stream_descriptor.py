from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class StreamDescriptor:
    name: str | None = None
    namespace: str | None = None
