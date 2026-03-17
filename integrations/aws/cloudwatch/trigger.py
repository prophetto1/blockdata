from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\cloudwatch\Trigger.java
# WARNING: Unresolved types: DimensionKV, Exception

from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Optional

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from integrations.aws.glue.model.output import Output
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from integrations.aws.athena.query import Query
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger):
    """Trigger on CloudWatch metric results"""
    sts_role_session_duration: Property[timedelta] = Property.ofValue(AbstractConnectionInterface.AWS_MIN_STS_ROLE_SESSION_DURATION)
    interval: timedelta = Duration.ofSeconds(60)
    access_key_id: Property[str] | None = None
    secret_key_id: Property[str] | None = None
    session_token: Property[str] | None = None
    region: Property[str] | None = None
    endpoint_override: Property[str] | None = None
    sts_role_arn: Property[str] | None = None
    sts_role_external_id: Property[str] | None = None
    sts_role_session_name: Property[str] | None = None
    sts_endpoint_override: Property[str] | None = None
    namespace: Property[str] | None = None
    metric_name: Property[str] | None = None
    statistic: Property[str] | None = None
    period_seconds: Property[int] | None = None
    window: Property[timedelta] | None = None
    dimensions: Property[list[Query.DimensionKV]] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java
