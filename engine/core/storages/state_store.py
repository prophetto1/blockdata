from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\storages\StateStore.java

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.resource_expired_exception import ResourceExpiredException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class StateStore:
    run_context: RunContext | None = None
    hash_task_run_value: bool | None = None

    def get_state(self, flow_scoped: bool, state_name: str, state_sub_name: str, task_run_value: str | None = None) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def put_state(self, flow_scoped: bool, state_name: str, state_sub_name: str, task_run_value: str, value: list[int] | None = None) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def delete_state(self, flow_scoped: bool, state_name: str, state_sub_name: str, task_run_value: str | None = None) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def old_state_store_uri(self, namespace: str, flow_scoped: bool, flow_id: str, state_name: str, task_run_value: str, name: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def state_prefix(self, separator: str, flow_scoped: bool, flow_id: str, state_name: str, task_run_value: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def name_suffix(name: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
