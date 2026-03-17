from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-nats\src\main\java\io\kestra\plugin\nats\core\RealtimeTrigger.java
# WARNING: Unresolved types: AtomicBoolean, CountDownLatch, DeliverPolicy, Exception, NatsMessageOutput, Publisher

from dataclasses import dataclass
from typing import Any

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.amqp.consume import Consume
from engine.core.models.executions.execution import Execution
from integrations.nats.core.nats_connection_interface import NatsConnectionInterface
from engine.core.models.property.property import Property
from engine.core.models.triggers.realtime_trigger_interface import RealtimeTriggerInterface
from engine.core.runners.run_context import RunContext
from integrations.mqtt.subscribe_interface import SubscribeInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class RealtimeTrigger(AbstractTrigger):
    """Trigger on real-time NATS messages"""
    batch_size: int = 10
    deliver_policy: Property[DeliverPolicy] = Property.ofValue(DeliverPolicy.All)
    is_active: AtomicBoolean = new AtomicBoolean(true)
    wait_for_termination: CountDownLatch = new CountDownLatch(1)
    url: str | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None
    token: Property[str] | None = None
    creds: Property[str] | None = None
    subject: str | None = None
    durable_id: Property[str] | None = None
    since: Property[str] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Publisher[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def publisher(self, task: Consume, run_context: RunContext) -> Publisher[Consume.NatsMessageOutput]:
        raise NotImplementedError  # TODO: translate from Java

    def kill(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self, wait: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java
