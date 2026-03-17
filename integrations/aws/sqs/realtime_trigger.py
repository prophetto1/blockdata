from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\sqs\RealtimeTrigger.java
# WARNING: Unresolved types: AtomicBoolean, CountDownLatch, Exception, Flux, Publisher

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.amqp.consume import Consume
from engine.core.models.executions.execution import Execution
from integrations.amqp.models.message import Message
from engine.core.models.property.property import Property
from engine.core.models.triggers.realtime_trigger_interface import RealtimeTriggerInterface
from engine.core.runners.run_context import RunContext
from integrations.amqp.models.serde_type import SerdeType
from integrations.aws.sqs.sqs_connection_interface import SqsConnectionInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class RealtimeTrigger(AbstractTrigger):
    """Trigger on SQS messages (realtime)"""
    max_concurrency: Property[int] = Property.ofValue(50)
    connection_acquisition_timeout: Property[timedelta] = Property.ofValue(Duration.ofSeconds(5))
    serde_type: Property[SerdeType] = Property.ofValue(SerdeType.STRING)
    sts_role_session_duration: Property[timedelta] = Property.ofValue(AbstractConnectionInterface.AWS_MIN_STS_ROLE_SESSION_DURATION)
    wait_time: Property[timedelta] = Property.ofValue(Duration.ofSeconds(20))
    max_number_of_message: Property[int] = Property.ofValue(5)
    client_retry_max_attempts: Property[int] = Property.ofValue(3)
    is_active: AtomicBoolean = new AtomicBoolean(true)
    wait_for_termination: CountDownLatch = new CountDownLatch(1)
    auto_delete: Property[bool] = Property.ofValue(true)
    visibility_timeout: Property[int] = Property.ofValue(30)
    queue_url: Property[str] | None = None
    access_key_id: Property[str] | None = None
    secret_key_id: Property[str] | None = None
    session_token: Property[str] | None = None
    region: Property[str] | None = None
    endpoint_override: Property[str] | None = None
    sts_role_arn: Property[str] | None = None
    sts_role_external_id: Property[str] | None = None
    sts_role_session_name: Property[str] | None = None
    sts_endpoint_override: Property[str] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Publisher[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def publisher(self, task: Consume, run_context: RunContext) -> Flux[Message]:
        raise NotImplementedError  # TODO: translate from Java

    def kill(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def stop(self, wait: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java
