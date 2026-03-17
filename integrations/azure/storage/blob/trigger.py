from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\blob\Trigger.java
# WARNING: Unresolved types: Action, CopyObject, Exception, Filter, On, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from enum import Enum
from datetime import timedelta
from typing import Any, Optional

from integrations.azure.storage.blob.abstracts.abstract_blob_storage_container_interface import AbstractBlobStorageContainerInterface
from integrations.aws.abstract_connection_interface import AbstractConnectionInterface
from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from integrations.aws.s3.action_interface import ActionInterface
from integrations.azure.azure_client_with_sas_interface import AzureClientWithSasInterface
from integrations.azure.storage.blob.models.blob import Blob
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.aws.s3.copy import Copy
from engine.core.models.executions.execution import Execution
from integrations.aws.s3.list_interface import ListInterface
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from engine.core.models.triggers.stateful_trigger_interface import StatefulTriggerInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger):
    """Trigger a flow on a new file arrival in an Azure Blob Storage container."""
    interval: timedelta = Duration.ofSeconds(60)
    filter: Property[ListInterface.Filter] = Property.ofValue(Filter.FILES)
    max_files: Property[int] = Property.ofValue(25)
    on: Property[On] = Property.ofValue(On.CREATE_OR_UPDATE)
    endpoint: Property[str] | None = None
    connection_string: Property[str] | None = None
    shared_key_account_name: Property[str] | None = None
    shared_key_account_access_key: Property[str] | None = None
    sas_token: Property[str] | None = None
    container: Property[str] | None = None
    prefix: Property[str] | None = None
    regexp: Property[str] | None = None
    delimiter: Property[str] | None = None
    action: Property[ActionInterface.Action] | None = None
    move_to: Copy.CopyObject | None = None
    state_key: Property[str] | None = None
    state_ttl: Property[timedelta] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        blobs: java.util.List[TriggeredBlob] | None = None

    @dataclass(slots=True)
    class TriggeredBlob:
        blob: Blob | None = None
        change_type: Trigger.ChangeType | None = None

    class ChangeType(str, Enum):
        CREATE = "CREATE"
        UPDATE = "UPDATE"
