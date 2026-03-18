from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-grafana\src\main\java\io\kestra\plugin\grafana\loki\Trigger.java
# WARNING: Unresolved types: Exception, On, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Optional

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
class Trigger(AbstractLokiTrigger):
    """Trigger flow on new Loki logs"""
    query: Property[str]
    interval: timedelta = Duration.ofMinutes(1)
    max_records: Property[int] = Property.ofValue(100)
    since: Property[str] = Property.ofValue("10m")
    state_ttl: Property[timedelta] = Property.ofValue(Duration.ofDays(1))
    state_key: Property[str] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_entry(timestamp: str, content: str, labels: dict[Any, Any]) -> Entry:
        raise NotImplementedError  # TODO: translate from Java

    def get_on(self) -> Property[On]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        logs: list[dict[str, Any]] | None = None
        count: int | None = None
        query: str | None = None
        result_type: str | None = None
        last_timestamp: str | None = None
