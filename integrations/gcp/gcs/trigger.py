from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\gcs\Trigger.java
# WARNING: Unresolved types: Action, Exception, ListingType, ObjectMapper, On, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass, field
from enum import Enum
from datetime import timedelta
from typing import Any, ClassVar, Optional

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from integrations.aws.s3.action_interface import ActionInterface
from integrations.azure.storage.blob.models.blob import Blob
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from integrations.gcp.gcp_interface import GcpInterface
from integrations.aws.s3.list_interface import ListInterface
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from engine.core.models.triggers.stateful_trigger_interface import StatefulTriggerInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger):
    """Trigger on new or updated GCS objects"""
    m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson()
    interval: timedelta = Duration.ofSeconds(60)
    scopes: Property[java.util.List[str]] = Property.ofValue(Collections.singletonList("https://www.googleapis.com/auth/cloud-platform"))
    listing_type: Property[List.ListingType] = Property.ofValue(ListingType.DIRECTORY)
    on: Property[On] = Property.ofValue(On.CREATE_OR_UPDATE)
    max_files: Property[int] = Property.ofValue(25)
    project_id: Property[str] | None = None
    service_account: Property[str] | None = None
    impersonated_service_account: Property[str] | None = None
    from: Property[str] | None = None
    action: Property[ActionInterface.Action] | None = None
    move_directory: Property[str] | None = None
    reg_exp: Property[str] | None = None
    state_key: Property[str] | None = None
    state_ttl: Property[timedelta] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    class ChangeType(str, Enum):
        CREATE = "CREATE"
        UPDATE = "UPDATE"

    @dataclass(slots=True)
    class TriggeredBlob:
        blob: Blob | None = None
        change_type: Trigger.ChangeType | None = None

        def to_blob(self) -> Blob:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        blobs: java.util.List[TriggeredBlob] | None = None
