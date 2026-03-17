from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class CanvasOutput(io):
    """Canvas output"""
    canvas_id: str

    def of(self, canvas_id: str) -> CanvasOutput:
        raise NotImplementedError  # TODO: translate from Java
