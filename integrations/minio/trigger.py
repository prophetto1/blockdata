from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any
from datetime import timedelta

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.minio.copy import Copy
from integrations.minio.downloads import Downloads
from engine.core.models.executions.execution import Execution
from integrations.minio.minio_connection_interface import MinioConnectionInterface
from integrations.minio.model.minio_object import MinioObject
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from engine.core.utils.rethrow import Rethrow
from engine.core.runners.run_context import RunContext
from engine.core.http.client.configurations.ssl_options import SslOptions
from engine.core.models.triggers.stateful_trigger_interface import StatefulTriggerInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


class ChangeType(str, Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger, PollingTriggerInterface, TriggerOutput, MinioConnectionInterface, StatefulTriggerInterface):
    """Trigger a flow on a new file arrival in a MinIO bucket."""
    interval: timedelta | None = None
    access_key_id: Property[str] | None = None
    secret_key_id: Property[str] | None = None
    region: Property[str] | None = None
    endpoint: Property[str] | None = None
    bucket: Property[str] | None = None
    prefix: Property[str] | None = None
    delimiter: Property[str] | None = None
    marker: Property[str] | None = None
    max_keys: Property[int] | None = None
    regexp: Property[str] | None = None
    filter: Property[list] | None = None
    action: Property[Downloads] | None = None
    move_to: Copy | None = None
    on: Property[On] | None = None
    state_key: Property[str] | None = None
    state_ttl: Property[timedelta] | None = None
    client_pem: Property[str] | None = None
    ca_pem: Property[str] | None = None
    ssl: SslOptions | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def get_minio_object(self, run_context: RunContext) -> Rethrow:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        objects: java | None = None

    @dataclass(slots=True)
    class TriggeredBlob:
        object: MinioObject | None = None
        change_type: Trigger | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    objects: java | None = None


@dataclass(slots=True, kw_only=True)
class TriggeredBlob:
    object: MinioObject | None = None
    change_type: Trigger | None = None
