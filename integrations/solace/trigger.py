from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-solace\src\main\java\io\kestra\plugin\solace\Trigger.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Optional

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.amqp.consume import Consume
from engine.core.models.executions.execution import Execution
from integrations.aws.glue.model.output import Output
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from integrations.solace.service.receiver.queue_types import QueueTypes
from integrations.azure.eventhubs.serdes.serdes import Serdes
from integrations.solace.solace_consume_interface import SolaceConsumeInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger):
    """Trigger flow from Solace queue"""
    interval: timedelta = Duration.ofSeconds(60)
    vpn: Property[str] = Property.ofValue("default")
    properties: Property[dict[str, str]] = Property.ofValue(new HashMap<>())
    message_deserializer: Property[Serdes] = Property.ofValue(Serdes.STRING)
    message_deserializer_properties: Property[dict[str, Any]] = Property.ofValue(new HashMap<>())
    max_messages: Property[int] = Property.ofValue(100)
    max_duration: Property[timedelta] = Property.ofValue(Duration.ofSeconds(10))
    username: Property[str] | None = None
    password: Property[str] | None = None
    host: Property[str] | None = None
    queue_name: Property[str] | None = None
    queue_type: Property[QueueTypes] | None = None
    message_selector: Property[str] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
