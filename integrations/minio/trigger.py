from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-minio\src\main\java\io\kestra\plugin\minio\Trigger.java
# WARNING: Unresolved types: Action, CopyObject, Exception, Filter, FunctionChecked, On, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from enum import Enum
from datetime import timedelta
from typing import Any, Optional

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.aws.s3.copy import Copy
from integrations.aws.s3.downloads import Downloads
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


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger):
    """Trigger a flow on a new file arrival in a MinIO bucket."""
    interval: timedelta = Duration.ofSeconds(60)
    max_keys: Property[int] = Property.ofValue(1000)
    filter: Property[List.Filter] = Property.ofValue(List.Filter.BOTH)
    on: Property[On] = Property.ofValue(On.CREATE_OR_UPDATE)
    access_key_id: Property[str] | None = None
    secret_key_id: Property[str] | None = None
    region: Property[str] | None = None
    endpoint: Property[str] | None = None
    bucket: Property[str] | None = None
    prefix: Property[str] | None = None
    delimiter: Property[str] | None = None
    marker: Property[str] | None = None
    regexp: Property[str] | None = None
    action: Property[Downloads.Action] | None = None
    move_to: Copy.CopyObject | None = None
    state_key: Property[str] | None = None
    state_ttl: Property[timedelta] | None = None
    client_pem: Property[str] | None = None
    ca_pem: Property[str] | None = None
    ssl: SslOptions | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def get_minio_object(self, run_context: RunContext) -> Rethrow.FunctionChecked[MinioObject, MinioObject, Exception]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        objects: java.util.List[TriggeredBlob] | None = None

    @dataclass(slots=True)
    class TriggeredBlob:
        object: MinioObject | None = None
        change_type: Trigger.ChangeType | None = None

    class ChangeType(str, Enum):
        CREATE = "CREATE"
        UPDATE = "UPDATE"
