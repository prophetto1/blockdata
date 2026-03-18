from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-databricks\src\main\java\io\kestra\plugin\databricks\sql\ParameterType.java
# WARNING: Unresolved types: Class, ClassNotFoundException, ParameterMetaData, SQLException

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class ParameterType:
    cls: dict[int, Class[Any]] = field(default_factory=dict)
    types: dict[int, int] = field(default_factory=dict)
    types_name: dict[int, str] = field(default_factory=dict)

    @staticmethod
    def of(parameter_meta_data: ParameterMetaData) -> ParameterType:
        raise NotImplementedError  # TODO: translate from Java

    def get_class(self, index: int) -> Class[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def get_type(self, index: int) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def get_type_name(self, index: int) -> str:
        raise NotImplementedError  # TODO: translate from Java
