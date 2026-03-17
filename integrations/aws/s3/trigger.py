from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any
from datetime import timedelta

from integrations.azure.abstract_connection_interface import AbstractConnectionInterface
from integrations.aws.s3.abstract_s3_object_interface import AbstractS3ObjectInterface
from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from integrations.gcp.gcs.action_interface import ActionInterface
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.minio.copy import Copy
from engine.core.models.executions.execution import Execution
from integrations.gcp.gcs.list_interface import ListInterface
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from integrations.aws.s3.models.s3_object import S3Object
from engine.core.models.triggers.stateful_trigger_interface import StatefulTriggerInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


class ChangeType(str, Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger, PollingTriggerInterface, TriggerOutput, ListInterface, ActionInterface, AbstractS3ObjectInterface, AbstractConnectionInterface, StatefulTriggerInterface):
    """Trigger on S3 object creation/update"""
    interval: timedelta | None = None
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
    max_keys: Property[int] | None = None
    expected_bucket_owner: Property[str] | None = None
    regexp: Property[str] | None = None
    filter: Property[Filter] | None = None
    action: Property[ActionInterface] | None = None
    move_to: Copy | None = None
    sts_role_arn: Property[str] | None = None
    sts_role_external_id: Property[str] | None = None
    sts_role_session_name: Property[str] | None = None
    sts_endpoint_override: Property[str] | None = None
    sts_role_session_duration: Property[timedelta] | None = None
    compatibility_mode: Property[bool] | None = None
    force_path_style: Property[bool] | None = None
    on: Property[On] | None = None
    max_files: Property[int] | None = None
    state_key: Property[str] | None = None
    state_ttl: Property[timedelta] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class TriggeredObject:
        object: S3Object | None = None
        change_type: ChangeType | None = None

        def to_object(self) -> S3Object:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        objects: java | None = None


@dataclass(slots=True, kw_only=True)
class TriggeredObject:
    object: S3Object | None = None
    change_type: ChangeType | None = None

    def to_object(self) -> S3Object:
        raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class Output(io):
    objects: java | None = None
