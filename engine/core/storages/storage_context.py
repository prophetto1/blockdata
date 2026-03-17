from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\storages\StorageContext.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow_id import FlowId
from engine.core.models.executions.task_run import TaskRun


@dataclass(slots=True, kw_only=True)
class StorageContext:
    k_e_s_t_r_a__s_c_h_e_m_e: str = "kestra"
    k_e_s_t_r_a__p_r_o_t_o_c_o_l: str = KESTRA_SCHEME + "://"
    p_r_e_f_i_x__m_e_s_s_a_g_e_s: str = "/_messages"
    p_r_e_f_i_x__f_o_r_m_a_t__n_a_m_e_s_p_a_c_e__f_i_l_e: str = "/%s/_files"
    p_r_e_f_i_x__f_o_r_m_a_t__k_v: str = "/%s/_kv"
    p_r_e_f_i_x__f_o_r_m_a_t__f_l_o_w_s: str = "/%s/%s"
    p_r_e_f_i_x__f_o_r_m_a_t__e_x_e_c_u_t_i_o_n_s: str = "/%s/%s/executions/%s"
    p_r_e_f_i_x__f_o_r_m_a_t__t_a_s_k: str = "/%s/%s/executions/%s/tasks/%s/%s"
    p_r_e_f_i_x__f_o_r_m_a_t__t_r_i_g_g_e_r: str = "/%s/%s/executions/%s/trigger/%s"
    p_r_e_f_i_x__f_o_r_m_a_t__i_n_p_u_t_s: str = "/%s/%s/executions/%s/inputs/%s/%s"
    p_r_e_f_i_x__f_o_r_m_a_t__c_a_c_h_e__o_b_j_e_c_t: str = "/%s/%s/%s/cache/%s/cache.zip"
    p_r_e_f_i_x__f_o_r_m_a_t__c_a_c_h_e: str = "/%s/%s/%s/cache/cache.zip"
    tenant_id: str | None = None
    namespace: str | None = None
    flow_id: str | None = None
    execution_id: str | None = None

    @staticmethod
    def for_task(task_run: TaskRun) -> StorageContext:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def for_flow(flow: FlowId) -> StorageContext:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def for_execution(execution: Execution) -> StorageContext:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def for_execution(tenant_id: str, namespace: str, flow_id: str, execution_id: str) -> StorageContext:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def for_input(execution: Execution, input_name: str, file_name: str) -> StorageContext.Input:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def for_task(tenant_id: str, namespace: str, flow_id: str, execution_id: str, task_id: str, task_run_id: str, task_run_value: str) -> StorageContext.Task:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def for_trigger(tenant_id: str, namespace: str, flow_id: str, execution_id: str, trigger_id: str) -> StorageContext.Trigger:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def extract_execution_id(path: str) -> Optional[str]:
        raise NotImplementedError  # TODO: translate from Java

    def get_cache_u_r_i(self, cache_id: str, object_id: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_namespace_as_path(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_state_store_prefix(self, id: str, is_namespace: bool, value: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_flow_storage_u_r_i(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_execution_storage_u_r_i(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_execution_storage_u_r_i(self, scheme: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_context_storage_u_r_i(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def to_string(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def namespace_file_prefix(namespace: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def kv_prefix(namespace: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Task(StorageContext):
        task_id: str | None = None
        task_run_id: str | None = None
        task_run_value: str | None = None

        def get_context_storage_u_r_i(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def to_string(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Trigger(StorageContext):
        trigger_id: str | None = None

        def get_context_storage_u_r_i(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def to_string(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Input(StorageContext):
        input_name: str | None = None
        file_name: str | None = None

        def get_context_storage_u_r_i(self) -> str:
            raise NotImplementedError  # TODO: translate from Java

        def to_string(self) -> str:
            raise NotImplementedError  # TODO: translate from Java
