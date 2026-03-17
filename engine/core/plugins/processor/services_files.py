from __future__ import annotations

# Source: E:\KESTRA\processor\src\main\java\io\kestra\core\plugins\processor\ServicesFiles.java
# WARNING: Unresolved types: IOException, InputStream, OutputStream

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class ServicesFiles:
    s_e_r_v_i_c_e_s__p_a_t_h: ClassVar[str] = "META-INF/services"

    @staticmethod
    def get_path(service_name: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def read_service_file(input: InputStream) -> set[str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def write_service_file(services: list[str], output: OutputStream) -> None:
        raise NotImplementedError  # TODO: translate from Java
