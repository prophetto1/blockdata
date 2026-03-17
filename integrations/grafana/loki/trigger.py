from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.grafana.loki.abstract_loki_trigger import AbstractLokiTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.aws.eventbridge.model.entry import Entry
from engine.core.models.executions.execution import Execution
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from engine.core.models.triggers.stateful_trigger_interface import StatefulTriggerInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractLokiTrigger, PollingTriggerInterface, TriggerOutput, StatefulTriggerInterface):
    """Trigger flow on new Loki logs"""
    query: Property[str]
    interval: timedelta | None = None
    max_records: Property[int] | None = None
    since: Property[str] | None = None
    state_ttl: Property[timedelta] | None = None
    state_key: Property[str] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def get_entry(self, timestamp: str, content: str, labels: dict[Any, Any]) -> Entry:
        raise NotImplementedError  # TODO: translate from Java

    def get_on(self) -> Property[On]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        logs: list[Map[String, Object]] | None = None
        count: int | None = None
        query: str | None = None
        result_type: str | None = None
        last_timestamp: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    logs: list[Map[String, Object]] | None = None
    count: int | None = None
    query: str | None = None
    result_type: str | None = None
    last_timestamp: str | None = None
