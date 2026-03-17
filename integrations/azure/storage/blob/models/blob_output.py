from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class BlobOutput(io):
    container: str | None = None
    name: str | None = None
    uri: str | None = None
    size: int | None = None
