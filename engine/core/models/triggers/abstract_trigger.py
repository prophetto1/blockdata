from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\triggers\AbstractTrigger.java
# WARNING: Unresolved types: Level

from dataclasses import dataclass
from typing import Any

from engine.core.models.assets.assets_declaration import AssetsDeclaration
from engine.core.models.conditions.condition import Condition
from engine.core.models.label import Label
from engine.core.serializers.list_or_map_of_label_deserializer import ListOrMapOfLabelDeserializer
from engine.core.serializers.list_or_map_of_label_serializer import ListOrMapOfLabelSerializer
from engine.core.models.flows.state import State
from engine.core.models.triggers.trigger_interface import TriggerInterface
from engine.core.models.flows.type import Type
from engine.core.models.tasks.worker_group import WorkerGroup


@dataclass(slots=True, kw_only=True)
class AbstractTrigger:
    disabled: bool = False
    log_to_file: bool = False
    fail_on_trigger_error: bool = False
    allow_concurrent: bool = False
    id: str | None = None
    type: str | None = None
    version: str | None = None
    description: str | None = None
    conditions: list[@Valid @NotNull Condition] | None = None
    worker_group: WorkerGroup | None = None
    log_level: Level | None = None
    labels: list[@NoSystemLabelValidation Label] | None = None
    stop_after: list[State.Type] | None = None
    assets: AssetsDeclaration | None = None
