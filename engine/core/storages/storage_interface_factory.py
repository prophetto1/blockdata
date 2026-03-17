from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\storages\StorageInterfaceFactory.java
# WARNING: Unresolved types: IOException, Stream, Validator

from dataclasses import dataclass
from typing import Any

from engine.core.plugins.plugin_registry import PluginRegistry
from engine.core.storages.storage_configuration import StorageConfiguration
from engine.core.storages.storage_interface import StorageInterface


@dataclass(slots=True, kw_only=True)
class StorageInterfaceFactory:
    k_e_s_t_r_a__s_t_o_r_a_g_e__t_y_p_e__c_o_n_f_i_g: str = "kestra.storage.type"
    plugin_registry: PluginRegistry | None = None
    validator: Validator | None = None

    def make(self, storage_configuration: StorageConfiguration, identifier: str, plugin_configuration: dict[str, Any]) -> StorageInterface:
        raise NotImplementedError  # TODO: translate from Java

    def init(self, storage_configuration: StorageConfiguration, plugin: StorageInterface) -> StorageInterface:
        raise NotImplementedError  # TODO: translate from Java

    def get_loggable_storage_ids(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def all_storage_classes(plugin_registry: PluginRegistry) -> Stream[TypeAndId]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def all_ids_for(classes: Stream[TypeAndId]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class TypeAndId:
        type: str | None = None
        id: str | None = None
