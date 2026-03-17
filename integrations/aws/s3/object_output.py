from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class ObjectOutput:
    e_tag: str | None = None
    version_id: str | None = None
