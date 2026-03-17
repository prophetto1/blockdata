from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\endpoints\VersionEndpoint.java
# WARNING: Unresolved types: Publisher

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.webserver.controllers.domain.server_info import ServerInfo
from engine.core.utils.version_provider import VersionProvider


@dataclass(slots=True, kw_only=True)
class VersionEndpoint:
    n_a_m_e: ClassVar[str] = "version"
    d_e_f_a_u_l_t__s_e_n_s_i_t_i_v_e: ClassVar[bool] = False
    v_e_r_s_i_o_n__s_u_f_f_i_x: ClassVar[str] = "-oss"
    server_type: str | None = None
    version: VersionProvider | None = None

    def version_suffix(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def version(self) -> Publisher[ServerInfo]:
        raise NotImplementedError  # TODO: translate from Java
