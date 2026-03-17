from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-influxdb\src\main\java\io\kestra\plugin\influxdb\FluxTrigger.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Optional

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.models.tasks.common.fetch_type import FetchType
from integrations.influxdb.flux_query import FluxQuery
from integrations.influxdb.influx_d_b_connection import InfluxDBConnection
from integrations.aws.glue.model.output import Output
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class FluxTrigger(AbstractTrigger):
    """Trigger flow when Flux query returns rows"""
    interval: timedelta = Duration.ofSeconds(60)
    fetch_type: Property[FetchType] = Property.ofValue(FetchType.NONE)
    connection: InfluxDBConnection | None = None
    org: Property[str] | None = None
    bucket: Property[str] | None = None
    query: Property[str] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
