from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\Flow.java
# WARNING: Unresolved types: AnnotatedMember, ConstraintViolationException, JacksonAnnotationIntrospector, ObjectMapper, Stream

from dataclasses import dataclass
from typing import Any

from engine.core.models.flows.abstract_flow import AbstractFlow
from engine.core.models.tasks.retrys.abstract_retry import AbstractRetry
from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.flows.check.check import Check
from engine.core.models.flows.concurrency import Concurrency
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.models.has_u_i_d import HasUID
from engine.core.exceptions.internal_exception import InternalException
from engine.core.models.listeners.listener import Listener
from engine.core.models.flows.output import Output
from engine.core.models.flows.plugin_default import PluginDefault
from engine.core.models.flows.sla.s_l_a import SLA
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class Flow(AbstractFlow):
    n_o_n__d_e_f_a_u_l_t__o_b_j_e_c_t__m_a_p_p_e_r: ObjectMapper = JacksonMapper.ofYaml()
        .copy()
        .setDefaultPropertyInclusion(JsonInclude.Include.NON_DEFAULT)
    w_i_t_h_o_u_t__r_e_v_i_s_i_o_n__o_b_j_e_c_t__m_a_p_p_e_r: ObjectMapper = NON_DEFAULT_OBJECT_MAPPER.copy()
        .configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true)
        .setAnnotationIntrospector(new JacksonAnnotationIntrospector() {
            @Override
            public boolean hasIgnoreMarker(final AnnotatedMember m) {
                List<String> exclusions = Arrays.asList("revision", "deleted", "source", "updated");
                return exclusions.contains(m.getName()) || super.hasIgnoreMarker(m);
            }
        })
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

    def get_task_defaults(self) -> list[PluginDefault]:
        raise NotImplementedError  # TODO: translate from Java

    def all_types(self) -> Stream[str]:
        raise NotImplementedError  # TODO: translate from Java

    def all_tasks(self) -> Stream[Task]:
        raise NotImplementedError  # TODO: translate from Java

    def all_tasks_with_childs(self) -> list[Task]:
        raise NotImplementedError  # TODO: translate from Java

    def all_tasks_with_childs(self, task: Task) -> Stream[Task]:
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

    def validate_update(self, updated: Flow) -> Optional[ConstraintViolationException]:
        raise NotImplementedError  # TODO: translate from Java

    def to_deleted(self) -> Flow:
        raise NotImplementedError  # TODO: translate from Java

    def get_source(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
