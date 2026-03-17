from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any
from datetime import timedelta

from integrations.azure.storage.blob.abstracts.abstract_blob_storage_container_interface import AbstractBlobStorageContainerInterface
from integrations.azure.abstract_connection_interface import AbstractConnectionInterface
from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from integrations.gcp.gcs.action_interface import ActionInterface
from integrations.azure.azure_client_with_sas_interface import AzureClientWithSasInterface
from integrations.gcp.gcs.models.blob import Blob
from engine.core.models.conditions.condition_context import ConditionContext
from integrations.minio.copy import Copy
from engine.core.models.executions.execution import Execution
from integrations.gcp.gcs.list_interface import ListInterface
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from engine.core.models.triggers.stateful_trigger_interface import StatefulTriggerInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


class ChangeType(str, Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger, PollingTriggerInterface, TriggerOutput, AbstractConnectionInterface, ListInterface, ActionInterface, AbstractBlobStorageContainerInterface, AzureClientWithSasInterface, StatefulTriggerInterface):
    """Trigger a flow on a new file arrival in an Azure Blob Storage container."""
    interval: timedelta | None = None
    endpoint: Property[str] | None = None
    connection_string: Property[str] | None = None
    shared_key_account_name: Property[str] | None = None
    shared_key_account_access_key: Property[str] | None = None
    sas_token: Property[str] | None = None
    container: Property[str] | None = None
    prefix: Property[str] | None = None
    regexp: Property[str] | None = None
    delimiter: Property[str] | None = None
    action: Property[ActionInterface] | None = None
    move_to: Copy | None = None
    filter: Property[ListInterface] | None = None
    max_files: Property[int] | None = None
    on: Property[On] | None = None
    state_key: Property[str] | None = None
    state_ttl: Property[timedelta] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        blobs: java | None = None

    @dataclass(slots=True)
    class TriggeredBlob:
        blob: Blob | None = None
        change_type: Trigger | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    blobs: java | None = None


@dataclass(slots=True, kw_only=True)
class TriggeredBlob:
    blob: Blob | None = None
    change_type: Trigger | None = None
