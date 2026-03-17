from __future__ import annotations

# Source: E:\KESTRA\tests\src\main\java\io\kestra\core\storage\StorageTestSuite.java
# WARNING: Unresolved types: Exception, IOException, URISyntaxException

from dataclasses import dataclass
from typing import Any

from engine.core.storages.file_attributes import FileAttributes
from engine.core.storages.storage_interface import StorageInterface


@dataclass(slots=True, kw_only=True)
class StorageTestSuite:
    c_o_n_t_e_n_t__s_t_r_i_n_g: str = "Content"
    storage_interface: StorageInterface | None = None

    def get_path(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_no_cross_tenant(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_with_scheme(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get(self, tenant_id: str, prefix: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_no_traversal(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_file_not_found(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_instance_resource(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def files_by_prefix(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def objects_by_prefix(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def list(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def list_no_traversal(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def list_not_found(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def list_no_cross_tenant(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def list_with_scheme(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def list(self, prefix: str, tenant_id: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def list_instance_resouces(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def exists(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def exists(self, prefix: str, tenant_id: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def exists_no_traversal(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def exists_no_cross_tenant(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def exists_with_scheme(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def exists_instance_resource(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def size(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def size(self, prefix: str, tenant_id: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def size_no_traversal(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def size_not_found(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def size_no_cross_tenant(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def size_with_scheme(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def last_modified_time(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def last_modified_time(self, prefix: str, tenant_id: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def last_modified_time_no_traversal(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def last_modified_time_not_found(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def last_modified_time_no_cross_tenant(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def last_modified_time_with_scheme(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_attributes(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_attributes(self, prefix: str, tenant_id: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_attributes_no_traversal(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_attributes_not_found(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_attributes_no_cross_tenant(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_attributes_with_scheme(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_instance_attributes(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def compare_directory(attr: FileAttributes) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def compare_file_attribute(attr: FileAttributes) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def put(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def put__path_with_tenant_string_in_it(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def put_from_another_file(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def put_with_scheme(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def put_no_traversal(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def put(self, tenant_id: str, prefix: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def put_instance_resource(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def delete_no_traversal(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def delete_not_found(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def delete(self, prefix: str, tenant_id: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def delete_with_scheme(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def delete_instance_resource(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def create_directory(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def create_directory_no_traversal(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def create_directory(self, prefix: str, tenant_id: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def create_directory_with_scheme(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def create_directory_should_be_recursive(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def create_instance_directory(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def move(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def move_not_found(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def move_no_traversal(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def move(self, prefix: str, tenant_id: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def move_with_scheme(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def delete_by_prefix(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def delete_by_prefix__path_with_tenant_string_in_it(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def delete_by_prefix_not_found(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def delete_by_prefix_no_traversal(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def delete_by_prefix(self, prefix: str, tenant_id: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def delete_by_prefix_with_scheme(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def metadata(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def limit_should_preserve_special_charts(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def put_file(self, tenant_id: str, path: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def put_file(self, tenant_id: str, path: str, metadata: dict[str, str]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def put_instance_file(self, path: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def put_instance_file(self, path: str, metadata: dict[str, str]) -> str:
        raise NotImplementedError  # TODO: translate from Java
