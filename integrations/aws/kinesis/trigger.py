from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\kinesis\Trigger.java
# WARNING: Unresolved types: Exception, IteratorType

from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Optional

from integrations.aws.kinesis.abstract_kinesis import AbstractKinesis
from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.amqp.consume import Consume
from engine.core.models.executions.execution import Execution
from integrations.aws.glue.model.output import Output
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger):
    """Trigger on Kinesis records (polling)"""
    stream_name: Property[str]
    sts_role_session_duration: Property[timedelta] = Property.ofValue(AbstractConnectionInterface.AWS_MIN_STS_ROLE_SESSION_DURATION)
    interval: timedelta = Duration.ofSeconds(60)
    iterator_type: Property[AbstractKinesis.IteratorType] = Property.ofValue(AbstractKinesis.IteratorType.LATEST)
    max_records: Property[int] = Property.ofValue(1000)
    max_duration: Property[timedelta] = Property.ofValue(Duration.ofSeconds(30))
    poll_duration: Property[timedelta] = Property.ofValue(Duration.ofSeconds(1))
    access_key_id: Property[str] | None = None
    secret_key_id: Property[str] | None = None
    session_token: Property[str] | None = None
    region: Property[str] | None = None
    endpoint_override: Property[str] | None = None
    sts_role_arn: Property[str] | None = None
    sts_role_external_id: Property[str] | None = None
    sts_role_session_name: Property[str] | None = None
    sts_endpoint_override: Property[str] | None = None
    starting_sequence_number: Property[str] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
