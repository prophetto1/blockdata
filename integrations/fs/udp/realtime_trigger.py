from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.models.property.property import Property
from engine.core.models.triggers.realtime_trigger_interface import RealtimeTriggerInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class RealtimeTrigger(AbstractTrigger, RealtimeTriggerInterface, TriggerOutput):
    """Trigger on incoming UDP messages"""
    host: Property[str] | None = None
    port: Property[int]
    buffer_size: Property[int] | None = None
    encoding: Property[str] | None = None
    active: AtomicBoolean | None = None
    socket: DatagramSocket | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Publisher[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def kill(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        payload: str | None = None
        timestamp: datetime | None = None
        source_ip: str | None = None
        source_port: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    payload: str | None = None
    timestamp: datetime | None = None
    source_ip: str | None = None
    source_port: int | None = None
