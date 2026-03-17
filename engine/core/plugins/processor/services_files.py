from __future__ import annotations

# Source: E:\KESTRA\processor\src\main\java\io\kestra\core\plugins\processor\ServicesFiles.java

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class ServicesFiles:
    services_path: ClassVar[str] = "META-INF/services"

    @staticmethod
    def get_path(service_name: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def read_service_file(input: Any) -> set[str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def write_service_file(services: list[str], output: Any) -> None:
        raise NotImplementedError  # TODO: translate from Java
