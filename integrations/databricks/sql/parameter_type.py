from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class ParameterType:
    cls: dict[Integer, Class[Any]] | None = None
    types: dict[Integer, Integer] | None = None
    types_name: dict[Integer, String] | None = None

    def of(self, parameter_meta_data: ParameterMetaData) -> ParameterType:
        raise NotImplementedError  # TODO: translate from Java

    def get_class(self, index: int) -> Class[Any]:
        raise NotImplementedError  # TODO: translate from Java

    def get_type(self, index: int) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def get_type_name(self, index: int) -> str:
        raise NotImplementedError  # TODO: translate from Java
