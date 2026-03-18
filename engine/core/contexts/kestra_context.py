from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\contexts\KestraContext.java
# WARNING: Unresolved types: AtomicReference, Environment

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, Callable, ClassVar, Optional

from engine.core.plugins.plugin_registry import PluginRegistry
from engine.core.models.server_type import ServerType
from engine.core.storages.storage_interface import StorageInterface


@dataclass(slots=True, kw_only=True)
class KestraContext(ABC):
    instance: ClassVar[AtomicReference[KestraContext]]
    logger: ClassVar[Logger] = getLogger(__name__)
    kestra_server_type: ClassVar[str] = "kestra.server-type"
    kestra_worker_max_num_threads: ClassVar[str] = "kestra.worker.max-num-threads"
    kestra_worker_group_key: ClassVar[str] = "kestra.worker.group-key"

    @staticmethod
    def get_context() -> KestraContext:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def get_server_type(self) -> ServerType:
        ...

    @abstractmethod
    def get_worker_max_num_threads(self) -> Optional[int]:
        ...

    @abstractmethod
    def get_worker_group_key(self) -> Optional[str]:
        ...

    @abstractmethod
    def inject_worker_configs(self, max_num_threads: int, worker_group_key: str) -> None:
        ...

    @abstractmethod
    def get_version(self) -> str:
        ...

    @abstractmethod
    def get_plugin_registry(self) -> PluginRegistry:
        ...

    @abstractmethod
    def get_storage_interface(self) -> StorageInterface:
        ...

    @abstractmethod
    def get_environments(self) -> set[str]:
        ...

    def shutdown(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Initializer(KestraContext):
        is_shutdown: bool
        application_context: ApplicationContext | None = None
        environment: Environment | None = None
        version: Callable[str] | None = None

        def get_server_type(self) -> ServerType:
            raise NotImplementedError  # TODO: translate from Java

        def get_worker_max_num_threads(self) -> Optional[int]:
            raise NotImplementedError  # TODO: translate from Java

        def get_worker_group_key(self) -> Optional[str]:
            raise NotImplementedError  # TODO: translate from Java

        def inject_worker_configs(self, max_num_threads: int, worker_group_key: str) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def shutdown(self) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def get_plugin_registry(self) -> PluginRegistry:
            raise NotImplementedError  # TODO: translate from Java

        def get_storage_interface(self) -> StorageInterface:
            raise NotImplementedError  # TODO: translate from Java

        def get_environments(self) -> set[str]:
            raise NotImplementedError  # TODO: translate from Java
