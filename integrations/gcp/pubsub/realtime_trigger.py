from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.solace.consume import Consume
from engine.core.models.executions.execution import Execution
from integrations.mqtt.services.message import Message
from engine.core.models.property.property import Property
from integrations.gcp.pubsub.pub_sub_connection_interface import PubSubConnectionInterface
from engine.core.models.triggers.realtime_trigger_interface import RealtimeTriggerInterface
from engine.core.runners.run_context import RunContext
from integrations.redis.models.serde_type import SerdeType
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class RealtimeTrigger(AbstractTrigger, RealtimeTriggerInterface, TriggerOutput, PubSubConnectionInterface):
    """Realtime Pub/Sub trigger"""
    project_id: Property[str] | None = None
    service_account: Property[str] | None = None
    impersonated_service_account: Property[str] | None = None
    scopes: Property[list[String]] | None = None
    topic: Property[str] | None = None
    subscription: Property[str] | None = None
    auto_create_subscription: Property[bool] | None = None
    interval: Property[timedelta] | None = None
    max_records: Property[int] | None = None
    max_duration: Property[timedelta] | None = None
    serde_type: Property[SerdeType]
    is_active: AtomicBoolean | None = None
    wait_for_termination: CountDownLatch | None = None
    subscriber_reference: AtomicReference[Subscriber] | None = None

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
