from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\Flow.java
# WARNING: Unresolved types: AnnotatedMember

from dataclasses import dataclass, field
from typing import Any, ClassVar, Iterator, Optional

from engine.core.models.flows.abstract_flow import AbstractFlow
from engine.core.models.tasks.retrys.abstract_retry import AbstractRetry
from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.flows.check.check import Check
from engine.core.models.flows.concurrency import Concurrency
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.models.has_uid import HasUID
from engine.core.exceptions.internal_exception import InternalException
from engine.core.models.listeners.listener import Listener
from engine.core.models.flows.output import Output
from engine.core.models.flows.plugin_default import PluginDefault
from engine.core.models.flows.sla.sla import SLA
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class Flow(AbstractFlow):
    non_default_object_mapper: ClassVar[ObjectMapper]
    without_revision_object_mapper: ClassVar[ObjectMapper]
    variables: dict[str, Any] | None = None
    tasks: list[Task] | None = None
    errors: list[Task] | None = None
    _finally: list[Task] | None = None
    listeners: list[Listener] | None = None
    after_execution: list[Task] | None = None
    triggers: list[AbstractTrigger] | None = None
    plugin_defaults: list[PluginDefault] | None = None
    task_defaults: list[PluginDefault] | None = None
    concurrency: Concurrency | None = None
    outputs: list[Output] | None = None
    retry: AbstractRetry | None = None
    sla: list[SLA] | None = None
    checks: list[Check] | None = None

    def get_finally(self) -> list[Task]:
        raise NotImplementedError  # TODO: translate from Java

    def all_types(self) -> Iterator[str]:
        raise NotImplementedError  # TODO: translate from Java

    def all_tasks(self) -> Iterator[Task]:
        raise NotImplementedError  # TODO: translate from Java

    def all_tasks_with_childs(self, task: Task | None = None) -> Iterator[Task]:
        raise NotImplementedError  # TODO: translate from Java

    def all_trigger_ids(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def all_tasks_with_childs_and_trigger_ids(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    def all_errors_with_children(self) -> list[Task]:
        raise NotImplementedError  # TODO: translate from Java

    def all_finally_with_children(self) -> list[Task]:
        raise NotImplementedError  # TODO: translate from Java

    def find_parent_tasks_by_task_id(self, task_id: str) -> Task:
        raise NotImplementedError  # TODO: translate from Java

    def find_task_by_task_id(self, task_id: str) -> Task:
        raise NotImplementedError  # TODO: translate from Java

    def find_task_by_task_id_or_null(self, task_id: str) -> Task:
        raise NotImplementedError  # TODO: translate from Java

    def find_trigger_by_trigger_id(self, trigger_id: str) -> AbstractTrigger:
        raise NotImplementedError  # TODO: translate from Java

    def update_task(self, task_id: str, new_value: Task) -> Flow:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def recursive_update(object: Any, previous: Task, new_value: Task) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def after_execution_tasks(self) -> list[Task]:
        raise NotImplementedError  # TODO: translate from Java

    def equals_without_revision(self, o: FlowInterface) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def validate_update(self, updated: Flow) -> Optional[ValueError]:
        raise NotImplementedError  # TODO: translate from Java

    def to_deleted(self) -> Flow:
        raise NotImplementedError  # TODO: translate from Java

    def get_source(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
