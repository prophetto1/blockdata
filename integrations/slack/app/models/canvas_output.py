from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-slack\src\main\java\io\kestra\plugin\slack\app\models\CanvasOutput.java
# WARNING: Unresolved types: core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.aws.glue.model.output import Output


@dataclass(slots=True, kw_only=True)
class CanvasOutput:
    """Canvas output"""
    canvas_id: str

    @staticmethod
    def of(canvas_id: str) -> CanvasOutput:
        raise NotImplementedError  # TODO: translate from Java
