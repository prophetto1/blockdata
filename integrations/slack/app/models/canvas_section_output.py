from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class CanvasSectionOutput(io):
    """Canvas sections output"""
    sections: list[CanvasDocumentSection] | None = None

    def of(self, sections: list[CanvasDocumentSection]) -> CanvasSectionOutput:
        raise NotImplementedError  # TODO: translate from Java
