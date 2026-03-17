from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-slack\src\main\java\io\kestra\plugin\slack\app\models\CanvasSectionOutput.java
# WARNING: Unresolved types: CanvasDocumentSection, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.aws.glue.model.output import Output


@dataclass(slots=True, kw_only=True)
class CanvasSectionOutput:
    """Canvas sections output"""
    sections: list[CanvasDocumentSection] | None = None

    @staticmethod
    def of(sections: list[CanvasDocumentSection]) -> CanvasSectionOutput:
        raise NotImplementedError  # TODO: translate from Java
