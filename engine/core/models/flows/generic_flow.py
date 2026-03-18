from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\GenericFlow.java

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.flows.abstract_flow import AbstractFlow
from engine.core.models.flows.concurrency import Concurrency
from engine.core.exceptions.deserialization_exception import DeserializationException
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.models.tasks.generic_task import GenericTask
from engine.core.models.triggers.generic_trigger import GenericTrigger
from engine.core.models.has_uid import HasUID
from engine.core.models.flows.sla.sla import SLA


@dataclass(slots=True, kw_only=True)
class GenericFlow(AbstractFlow):
    additional_properties: dict[str, Any] = field(default_factory=dict)
    source: str | None = None
    sla: list[SLA] | None = None
    concurrency: Concurrency | None = None
    tasks: list[GenericTask] | None = None
    triggers: list[GenericTrigger] | None = None

    @staticmethod
    def of(flow: FlowInterface) -> GenericFlow:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from_yaml(tenant_id: str, source: str) -> GenericFlow:
        raise NotImplementedError  # TODO: translate from Java

    def to_deleted(self) -> FlowInterface:
        raise NotImplementedError  # TODO: translate from Java
