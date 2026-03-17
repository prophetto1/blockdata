from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.solace.abstract_solace_task import AbstractSolaceTask
from engine.core.models.property.data import Data
from integrations.solace.service.publisher.delivery_modes import DeliveryModes
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.solace.serde.serdes import Serdes


@dataclass(slots=True, kw_only=True)
class Produce(AbstractSolaceTask, RunnableTask, Data):
    """Publish messages to Solace topics"""
    from: Any
    topic_destination: Property[str]
    message_serializer: Property[Serdes] | None = None
    message_serializer_properties: Property[dict[String, Object]] | None = None
    delivery_mode: Property[DeliveryModes] | None = None
    await_acknowledgement_timeout: Property[timedelta]
    message_properties: Property[dict[String, String]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def send(self, run_context: RunContext, stream: InputStream) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        messages_count: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    messages_count: int | None = None
