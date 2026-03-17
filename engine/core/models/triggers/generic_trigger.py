from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\triggers\GenericTrigger.java

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.triggers.trigger_interface import TriggerInterface
from engine.core.models.tasks.worker_group import WorkerGroup


@dataclass(slots=True, kw_only=True)
class GenericTrigger:
    additional_properties: dict[str, Any] = field(default_factory=dict)
    version: str | None = None
    id: str | None = None
    type: str | None = None
    worker_group: WorkerGroup | None = None

    def get_additional_properties(self) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java
