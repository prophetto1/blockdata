from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\contexts\KestraBeansFactory.java
# WARNING: Unresolved types: Validator

from dataclasses import dataclass
from typing import Any, Optional

from engine.core.http.client.http_client import HttpClient
from engine.core.plugins.plugin_catalog_service import PluginCatalogService
from engine.core.plugins.plugin_registry import PluginRegistry
from engine.core.storages.storage_interface import StorageInterface
from engine.core.storages.storage_interface_factory import StorageInterfaceFactory


@dataclass(slots=True, kw_only=True)
class KestraBeansFactory:
    validator: Validator | None = None
    storage_config: StorageConfig | None = None
    storage_type: Optional[str] | None = None

    def plugin_catalog_service(self, http_client: HttpClient) -> PluginCatalogService:
        raise NotImplementedError  # TODO: translate from Java

    def plugin_registry(self) -> PluginRegistry:
        raise NotImplementedError  # TODO: translate from Java

    def storage_interface_factory(self, plugin_registry: PluginRegistry) -> StorageInterfaceFactory:
        raise NotImplementedError  # TODO: translate from Java

    def storage_interface(self, storage_interface_factory: StorageInterfaceFactory) -> StorageInterface:
        raise NotImplementedError  # TODO: translate from Java

    def get_storage_plugin_id(self, storage_interface_factory: StorageInterfaceFactory) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class StorageConfig:
        storage: dict[str, Any] | None = None

        def get_storage_config(self, type: str) -> dict[str, Any]:
            raise NotImplementedError  # TODO: translate from Java
