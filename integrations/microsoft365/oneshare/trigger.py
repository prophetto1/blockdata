from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.microsoft365.abstract_microsoft365_trigger import AbstractMicrosoft365Trigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from integrations.microsoft365.oneshare.models.one_share_file import OneShareFile
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from engine.core.models.triggers.stateful_trigger_interface import StatefulTriggerInterface
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractMicrosoft365Trigger, PollingTriggerInterface, StatefulTriggerInterface, TriggerOutput):
    """Trigger on OneDrive/SharePoint file changes"""
    d_e_l_t_a__l_i_n_k__k_e_y: str | None = None
    drive_id: Property[str] | None = None
    site_id: Property[str] | None = None
    path: Property[str]
    interval: timedelta | None = None
    on: Property[StatefulTriggerInterface] | None = None
    state_key: Property[str] | None = None
    state_ttl: Property[timedelta] | None = None

    def get_interval(self) -> timedelta:
        raise NotImplementedError  # TODO: translate from Java

    def get_on(self) -> Property[StatefulTriggerInterface]:
        raise NotImplementedError  # TODO: translate from Java

    def get_state_key(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_state_ttl(self) -> Property[timedelta]:
        raise NotImplementedError  # TODO: translate from Java

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def execute_delta_query(self, graph_client: GraphServiceClient, drive_id: str, site_id: str, path: str, delta_link: str) -> DeltaGetResponse:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_delta_by_link(self, graph_client: GraphServiceClient, next_link: str) -> DeltaGetResponse:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        files: list[OneShareFile] | None = None
        count: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    files: list[OneShareFile] | None = None
    count: int | None = None
