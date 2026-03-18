from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\pubsub\RealtimeTrigger.java
# WARNING: Unresolved types: AtomicBoolean, AtomicReference, CountDownLatch, Exception, Publisher, Subscriber

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.amqp.consume import Consume
from engine.core.models.executions.execution import Execution
from integrations.amqp.models.message import Message
from engine.core.models.property.property import Property
from integrations.gcp.pubsub.pub_sub_connection_interface import PubSubConnectionInterface
from engine.core.models.triggers.realtime_trigger_interface import RealtimeTriggerInterface
from engine.core.runners.run_context import RunContext
from integrations.amqp.models.serde_type import SerdeType
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class RealtimeTrigger(AbstractTrigger):
    """Realtime Pub/Sub trigger"""
    scopes: Property[list[str]] = Property.ofValue(Collections.singletonList("https://www.googleapis.com/auth/cloud-platform"))
    auto_create_subscription: Property[bool] = Property.ofValue(true)
    interval: Property[timedelta] = Property.ofValue(Duration.ofSeconds(60))
    serde_type: Property[SerdeType] = Property.ofValue(SerdeType.STRING)
    is_active: AtomicBoolean = new AtomicBoolean(true)
    wait_for_termination: CountDownLatch = new CountDownLatch(1)
    subscriber_reference: AtomicReference[Subscriber] = new AtomicReference<>()
    project_id: Property[str] | None = None
    service_account: Property[str] | None = None
    impersonated_service_account: Property[str] | None = None
    topic: Property[str] | None = None
    subscription: Property[str] | None = None
    max_records: Property[int] | None = None
    max_duration: Property[timedelta] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Publisher[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def publisher(self, task: Consume, run_context: RunContext) -> Publisher[Message]:
        raise NotImplementedError  # TODO: translate from Java

    def kill(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self, wait: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java
