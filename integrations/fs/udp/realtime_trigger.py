from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fs\src\main\java\io\kestra\plugin\fs\udp\RealtimeTrigger.java
# WARNING: Unresolved types: AtomicBoolean, DatagramSocket, Exception, Publisher, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.models.property.property import Property
from engine.core.models.triggers.realtime_trigger_interface import RealtimeTriggerInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class RealtimeTrigger(AbstractTrigger):
    """Trigger on incoming UDP messages"""
    port: Property[int]
    host: Property[str] = Property.ofValue("0.0.0.0")
    buffer_size: Property[int] = Property.ofValue(1024)
    encoding: Property[str] = Property.ofValue(StandardCharsets.UTF_8.name())
    active: AtomicBoolean = new AtomicBoolean(false)
    socket: DatagramSocket | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Publisher[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def kill(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        payload: str | None = None
        timestamp: datetime | None = None
        source_ip: str | None = None
        source_port: int | None = None
