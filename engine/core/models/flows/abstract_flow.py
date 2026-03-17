from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\AbstractFlow.java

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.models.flows.input import Input
from engine.core.models.label import Label
from engine.core.serializers.list_or_map_of_label_deserializer import ListOrMapOfLabelDeserializer
from engine.core.serializers.list_or_map_of_label_serializer import ListOrMapOfLabelSerializer
from engine.core.models.flows.output import Output
from engine.core.models.tasks.worker_group import WorkerGroup


@dataclass(slots=True, kw_only=True)
class AbstractFlow:
    id: str
    namespace: str
    disabled: bool = False
    deleted: bool = False
    revision: int | None = None
    updated: datetime | None = None
    description: str | None = None
    inputs: list[Input[Any]] | None = None
    outputs: list[Output] | None = None
    tenant_id: str | None = None
    labels: list[Label] | None = None
    variables: dict[str, Any] | None = None
    worker_group: WorkerGroup | None = None
