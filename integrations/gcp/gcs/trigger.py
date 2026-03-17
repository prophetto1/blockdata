from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any
from datetime import timedelta

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from integrations.gcp.gcs.action_interface import ActionInterface
from integrations.gcp.gcs.models.blob import Blob
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from integrations.googleworkspace.gcp_interface import GcpInterface
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
class Trigger(AbstractTrigger, PollingTriggerInterface, TriggerOutput, GcpInterface, ListInterface, ActionInterface, StatefulTriggerInterface):
    """Trigger on new or updated GCS objects"""
    m_a_p_p_e_r: ObjectMapper | None = None
    interval: timedelta | None = None
    project_id: Property[str] | None = None
    service_account: Property[str] | None = None
    impersonated_service_account: Property[str] | None = None
    scopes: Property[java] | None = None
    from: Property[str] | None = None
    action: Property[ActionInterface] | None = None
    move_directory: Property[str] | None = None
    listing_type: Property[list] | None = None
    reg_exp: Property[str] | None = None
    on: Property[On] | None = None
    state_key: Property[str] | None = None
    state_ttl: Property[timedelta] | None = None
    max_files: Property[int] | None = None

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class TriggeredBlob:
        blob: Blob | None = None
        change_type: Trigger | None = None

        def to_blob(self) -> Blob:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        blobs: java | None = None


@dataclass(slots=True, kw_only=True)
class TriggeredBlob:
    blob: Blob | None = None
    change_type: Trigger | None = None

    def to_blob(self) -> Blob:
        raise NotImplementedError  # TODO: translate from Java


@dataclass(slots=True, kw_only=True)
class Output(io):
    blobs: java | None = None
