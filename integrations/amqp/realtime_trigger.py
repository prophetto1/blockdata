from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-amqp\src\main\java\io\kestra\plugin\amqp\RealtimeTrigger.java
# WARNING: Unresolved types: AtomicBoolean, CountDownLatch, Exception, Publisher

from dataclasses import dataclass
from typing import Any

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from integrations.amqp.amqp_connection_interface import AmqpConnectionInterface
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.amqp.consume import Consume
from integrations.amqp.consume_base_interface import ConsumeBaseInterface
from engine.core.models.executions.execution import Execution
from integrations.amqp.models.message import Message
from engine.core.models.property.property import Property
from engine.core.models.triggers.realtime_trigger_interface import RealtimeTriggerInterface
from engine.core.runners.run_context import RunContext
from integrations.amqp.models.serde_type import SerdeType
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class RealtimeTrigger(AbstractTrigger):
    """Stream AMQP messages into real-time executions"""
    host: Property[str]
    port: Property[str] = Property.ofValue("5672")
    virtual_host: Property[str] = Property.ofValue("/")
    consumer_tag: Property[str] = Property.ofValue("Kestra")
    auto_ack: Property[bool] = Property.ofValue(false)
    serde_type: Property[SerdeType] = Property.ofValue(SerdeType.STRING)
    is_active: AtomicBoolean = new AtomicBoolean(true)
    wait_for_termination: CountDownLatch = new CountDownLatch(1)
    url: Property[str] | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None
    queue: Property[str] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Publisher[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def publisher(self, task: Consume, run_context: RunContext) -> Publisher[Message]:
        raise NotImplementedError  # TODO: translate from Java

    def busy_wait(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def kill(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self, wait: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java
