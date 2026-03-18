from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\controllers\api\TriggerController.java
# WARNING: Unresolved types: MutableHttpResponse

from dataclasses import dataclass, field
from enum import Enum
from logging import Logger, getLogger
from typing import Any, ClassVar

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.triggers.backfill import Backfill
from engine.core.services.condition_service import ConditionService
from engine.core.models.executions.execution_killed import ExecutionKilled
from engine.core.models.flows.flow import Flow
from engine.core.repositories.flow_repository_interface import FlowRepositoryInterface
from engine.webserver.responses.paged_results import PagedResults
from engine.core.models.query_filter import QueryFilter
from engine.core.queues.queue_exception import QueueException
from engine.core.queues.queue_interface import QueueInterface
from engine.core.runners.run_context_factory import RunContextFactory
from engine.core.tenant.tenant_service import TenantService
from engine.core.models.triggers.trigger import Trigger
from engine.core.repositories.trigger_repository_interface import TriggerRepositoryInterface


@dataclass(slots=True, kw_only=True)
class TriggerController:
    logger: ClassVar[Logger] = getLogger(__name__)
    trigger_repository: TriggerRepositoryInterface | None = None
    trigger_queue: QueueInterface[Trigger] | None = None
    execution_killed_queue: QueueInterface[ExecutionKilled] | None = None
    flow_repository: FlowRepositoryInterface | None = None
    tenant_service: TenantService | None = None
    run_context_factory: RunContextFactory | None = None
    condition_service: ConditionService | None = None
    object_mapper: ObjectMapper | None = None

    def search_triggers(self, page: int, size: int, sort: list[str], filters: list[QueryFilter], query: str, namespace: str, worker_id: str, flow_id: str) -> PagedResults[Triggers]:
        raise NotImplementedError  # TODO: translate from Java

    def unlock_trigger(self, namespace: str, flow_id: str, trigger_id: str) -> HttpResponse[Trigger]:
        raise NotImplementedError  # TODO: translate from Java

    def unlock_triggers_by_ids(self, triggers: list[Trigger]) -> MutableHttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def unlock_triggers_by_query(self, filters: list[QueryFilter], query: str, namespace: str) -> MutableHttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def search_triggers_for_flow(self, page: int, size: int, sort: list[str], query: str, namespace: str, flow_id: str) -> PagedResults[Trigger]:
        raise NotImplementedError  # TODO: translate from Java

    def update_trigger(self, new_trigger: Trigger) -> HttpResponse[Trigger]:
        raise NotImplementedError  # TODO: translate from Java

    def restart_trigger(self, namespace: str, flow_id: str, trigger_id: str) -> HttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def pause_backfill(self, trigger: Trigger) -> HttpResponse[Trigger]:
        raise NotImplementedError  # TODO: translate from Java

    def pause_backfill_by_ids(self, triggers: list[Trigger]) -> MutableHttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def pause_backfill_by_query(self, filters: list[QueryFilter], query: str, namespace: str) -> MutableHttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def unpause_backfill(self, trigger: Trigger) -> HttpResponse[Trigger]:
        raise NotImplementedError  # TODO: translate from Java

    def unpause_backfill_by_ids(self, triggers: list[Trigger]) -> MutableHttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def unpause_backfill_by_query(self, filters: list[QueryFilter], query: str, namespace: str) -> MutableHttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def delete_backfill(self, trigger: Trigger) -> HttpResponse[Trigger]:
        raise NotImplementedError  # TODO: translate from Java

    def delete_backfill_by_ids(self, triggers: list[Trigger]) -> MutableHttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def delete_backfill_by_query(self, filters: list[QueryFilter], query: str, namespace: str) -> MutableHttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def delete_trigger(self, namespace: str, flow_id: str, trigger_id: str) -> MutableHttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def delete_triggers_by_ids(self, triggers: list[Trigger]) -> MutableHttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def delete_triggers_by_query(self, filters: list[QueryFilter]) -> MutableHttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def disabled_triggers_by_ids(self, set_disabled_request: SetDisabledRequest) -> MutableHttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def disabled_triggers_by_query(self, filters: list[QueryFilter], query: str, namespace: str, disabled: bool) -> MutableHttpResponse[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def export_triggers(self, filters: list[QueryFilter]) -> MutableHttpResponse[Flux]:
        raise NotImplementedError  # TODO: translate from Java

    def do_set_trigger_disabled(self, current_state: Trigger, disabled: bool, flow: Flow, trigger: AbstractTrigger) -> Trigger:
        raise NotImplementedError  # TODO: translate from Java

    def do_set_trigger_backfill(self, current_state: Trigger, backfill: Backfill, flow: Flow, trigger: AbstractTrigger) -> Trigger:
        raise NotImplementedError  # TODO: translate from Java

    def backfills_action(self, triggers: list[Trigger], action: BACKFILL_ACTION) -> int:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Triggers:
        abstract_trigger: AbstractTrigger | None = None
        trigger_context: Trigger | None = None

    @dataclass(slots=True)
    class SetDisabledRequest:
        triggers: list[Trigger] | None = None
        disabled: bool | None = None

    class BACKFILL_ACTION(str, Enum):
        PAUSE = "PAUSE"
        UNPAUSE = "UNPAUSE"
        DELETE = "DELETE"
