from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.solace.consume import Consume
from engine.core.models.executions.execution import Execution
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from integrations.redis.models.serde_type import SerdeType
from integrations.aws.sqs.sqs_connection_interface import SqsConnectionInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger, PollingTriggerInterface, TriggerOutput, SqsConnectionInterface):
    """Trigger on SQS messages (batch polling)"""
    queue_url: Property[str] | None = None
    access_key_id: Property[str] | None = None
    secret_key_id: Property[str] | None = None
    session_token: Property[str] | None = None
    region: Property[str] | None = None
    endpoint_override: Property[str] | None = None
    max_concurrency: Property[int] | None = None
    connection_acquisition_timeout: Property[timedelta] | None = None
    interval: timedelta | None = None
    max_records: Property[int] | None = None
    max_duration: Property[timedelta] | None = None
    serde_type: Property[SerdeType]
    sts_role_arn: Property[str] | None = None
    sts_role_external_id: Property[str] | None = None
    sts_role_session_name: Property[str] | None = None
    sts_endpoint_override: Property[str] | None = None
    sts_role_session_duration: Property[timedelta] | None = None
    auto_delete: Property[bool] | None = None
    visibility_timeout: Property[int] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
