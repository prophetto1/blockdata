from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\JdbcTableConfigsFactory.java
# WARNING: Unresolved types: Class

from dataclasses import dataclass
from typing import Any

from engine.jdbc.jdbc_table_config import JdbcTableConfig


@dataclass(slots=True, kw_only=True)
class JdbcTableConfigsFactory:

    def queues(self) -> InstantiableJdbcTableConfig:
        raise NotImplementedError  # TODO: translate from Java

    def flows(self) -> InstantiableJdbcTableConfig:
        raise NotImplementedError  # TODO: translate from Java

    def executions(self) -> InstantiableJdbcTableConfig:
        raise NotImplementedError  # TODO: translate from Java

    def templates(self) -> InstantiableJdbcTableConfig:
        raise NotImplementedError  # TODO: translate from Java

    def triggers(self) -> InstantiableJdbcTableConfig:
        raise NotImplementedError  # TODO: translate from Java

    def logs(self) -> InstantiableJdbcTableConfig:
        raise NotImplementedError  # TODO: translate from Java

    def metrics(self) -> InstantiableJdbcTableConfig:
        raise NotImplementedError  # TODO: translate from Java

    def multiple_conditions(self) -> InstantiableJdbcTableConfig:
        raise NotImplementedError  # TODO: translate from Java

    def executor_state(self) -> InstantiableJdbcTableConfig:
        raise NotImplementedError  # TODO: translate from Java

    def executor_delayed(self) -> InstantiableJdbcTableConfig:
        raise NotImplementedError  # TODO: translate from Java

    def flow_topologies(self) -> InstantiableJdbcTableConfig:
        raise NotImplementedError  # TODO: translate from Java

    def service_instance(self) -> InstantiableJdbcTableConfig:
        raise NotImplementedError  # TODO: translate from Java

    def worker_job_running(self) -> InstantiableJdbcTableConfig:
        raise NotImplementedError  # TODO: translate from Java

    def execution_queued(self) -> InstantiableJdbcTableConfig:
        raise NotImplementedError  # TODO: translate from Java

    def sla_monitor(self) -> InstantiableJdbcTableConfig:
        raise NotImplementedError  # TODO: translate from Java

    def dashboards(self) -> InstantiableJdbcTableConfig:
        raise NotImplementedError  # TODO: translate from Java

    def concurrency_limit(self) -> InstantiableJdbcTableConfig:
        raise NotImplementedError  # TODO: translate from Java

    def kv_metadata(self) -> InstantiableJdbcTableConfig:
        raise NotImplementedError  # TODO: translate from Java

    def namespace_file_metadata(self) -> InstantiableJdbcTableConfig:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class InstantiableJdbcTableConfig(JdbcTableConfig):
        pass
