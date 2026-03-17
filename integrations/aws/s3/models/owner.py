from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class Owner:
    id: str | None = None
    display_name: str | None = None

    def of(self, object: software) -> Owner:
        raise NotImplementedError  # TODO: translate from Java
