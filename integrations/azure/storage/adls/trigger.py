from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\adls\Trigger.java
# WARNING: Unresolved types: Exception, On, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from enum import Enum
from datetime import timedelta
from typing import Any, Optional

from integrations.aws.abstract_connection_interface import AbstractConnectionInterface
from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from integrations.azure.storage.adls.models.adls_file import AdlsFile
from integrations.azure.azure_client_with_sas_interface import AzureClientWithSasInterface
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from engine.core.models.triggers.stateful_trigger_interface import StatefulTriggerInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger):
    """Trigger a flow on new file arrival in Azure Data Lake Storage."""
    interval: timedelta = Duration.ofSeconds(60)
    action: Property[Action] = Property.ofValue(Action.NONE)
    max_files: Property[int] = Property.ofValue(25)
    on: Property[On] = Property.ofValue(On.CREATE_OR_UPDATE)
    endpoint: Property[str] | None = None
    connection_string: Property[str] | None = None
    shared_key_account_name: Property[str] | None = None
    shared_key_account_access_key: Property[str] | None = None
    sas_token: Property[str] | None = None
    file_system: Property[str] | None = None
    directory_path: Property[str] | None = None
    move_to: DestinationObject | None = None
    state_key: Property[str] | None = None
    state_ttl: Property[timedelta] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    class Action(str, Enum):
        MOVE = "MOVE"
        DELETE = "DELETE"
        NONE = "NONE"

    @dataclass(slots=True)
    class DestinationObject:
        file_system: Property[str]
        directory_path: Property[str]

    @dataclass(slots=True)
    class TriggeredFile:
        file: AdlsFile | None = None
        change_type: ChangeType | None = None

    @dataclass(slots=True)
    class Output:
        files: java.util.List[TriggeredFile] | None = None

    class ChangeType(str, Enum):
        CREATE = "CREATE"
        UPDATE = "UPDATE"
