from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\sqs\Trigger.java
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
from integrations.amqp.models.serde_type import SerdeType
from integrations.aws.sqs.sqs_connection_interface import SqsConnectionInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger):
    """Trigger on SQS messages (batch polling)"""
    max_concurrency: Property[int] = Property.ofValue(50)
    connection_acquisition_timeout: Property[timedelta] = Property.ofValue(Duration.ofSeconds(5))
    interval: timedelta = Duration.ofSeconds(60)
    serde_type: Property[SerdeType] = Property.ofValue(SerdeType.STRING)
    sts_role_session_duration: Property[timedelta] = Property.ofValue(AbstractConnectionInterface.AWS_MIN_STS_ROLE_SESSION_DURATION)
    auto_delete: Property[bool] = Property.ofValue(true)
    visibility_timeout: Property[int] = Property.ofValue(30)
    queue_url: Property[str] | None = None
    access_key_id: Property[str] | None = None
    secret_key_id: Property[str] | None = None
    session_token: Property[str] | None = None
    region: Property[str] | None = None
    endpoint_override: Property[str] | None = None
    max_records: Property[int] | None = None
    max_duration: Property[timedelta] | None = None
    sts_role_arn: Property[str] | None = None
    sts_role_external_id: Property[str] | None = None
    sts_role_session_name: Property[str] | None = None
    sts_endpoint_override: Property[str] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
