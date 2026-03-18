from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\s3\Trigger.java
# WARNING: Unresolved types: Action, CopyObject, Exception, Filter, On, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from enum import Enum
from datetime import timedelta
from typing import Any, Optional

from integrations.aws.abstract_connection_interface import AbstractConnectionInterface
from integrations.aws.s3.abstract_s3_object_interface import AbstractS3ObjectInterface
from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from integrations.aws.s3.action_interface import ActionInterface
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.aws.s3.copy import Copy
from engine.core.models.executions.execution import Execution
from integrations.aws.s3.list_interface import ListInterface
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from integrations.aws.s3.models.s3_object import S3Object
from engine.core.models.triggers.stateful_trigger_interface import StatefulTriggerInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger):
    """Trigger on S3 object creation/update"""
    interval: timedelta = Duration.ofSeconds(60)
    max_keys: Property[int] = Property.ofValue(1000)
    filter: Property[Filter] = Property.ofValue(Filter.BOTH)
    sts_role_session_duration: Property[timedelta] = Property.ofValue(AbstractConnectionInterface.AWS_MIN_STS_ROLE_SESSION_DURATION)
    compatibility_mode: Property[bool] = Property.ofValue(false)
    force_path_style: Property[bool] = Property.ofValue(false)
    on: Property[On] = Property.ofValue(On.CREATE_OR_UPDATE)
    max_files: Property[int] = Property.ofValue(25)
    access_key_id: Property[str] | None = None
    secret_key_id: Property[str] | None = None
    session_token: Property[str] | None = None
    region: Property[str] | None = None
    endpoint_override: Property[str] | None = None
    request_payer: Property[str] | None = None
    bucket: Property[str] | None = None
    prefix: Property[str] | None = None
    delimiter: Property[str] | None = None
    marker: Property[str] | None = None
    encoding_type: Property[str] | None = None
    expected_bucket_owner: Property[str] | None = None
    regexp: Property[str] | None = None
    action: Property[ActionInterface.Action] | None = None
    move_to: Copy.CopyObject | None = None
    sts_role_arn: Property[str] | None = None
    sts_role_external_id: Property[str] | None = None
    sts_role_session_name: Property[str] | None = None
    sts_endpoint_override: Property[str] | None = None
    state_key: Property[str] | None = None
    state_ttl: Property[timedelta] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    class ChangeType(str, Enum):
        CREATE = "CREATE"
        UPDATE = "UPDATE"

    @dataclass(slots=True)
    class TriggeredObject:
        object: S3Object | None = None
        change_type: ChangeType | None = None

        def to_object(self) -> S3Object:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        objects: java.util.List[TriggeredObject] | None = None
