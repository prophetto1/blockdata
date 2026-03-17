from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\FlowAutoLoaderService.java
# WARNING: Unresolved types: Pattern

from dataclasses import dataclass
from typing import Any

from engine.core.repositories.flow_repository_interface import FlowRepositoryInterface
from engine.core.http.client.http_client import HttpClient
from engine.core.contexts.kestra_config import KestraConfig
from engine.core.tenant.tenant_service import TenantService
from engine.core.utils.version_provider import VersionProvider


@dataclass(slots=True, kw_only=True)
class FlowAutoLoaderService:
    n_a_m_e_s_p_a_c_e__f_r_o_m__f_l_o_w__s_o_u_r_c_e__p_a_t_t_e_r_n: Pattern = Pattern.compile("^namespace: \\S*", Pattern.MULTILINE)
    p_u_r_g_e__s_y_s_t_e_m__f_l_o_w__b_l_u_e_p_r_i_n_t__i_d: str = "234"
    repository: FlowRepositoryInterface | None = None
    http_client: HttpClient | None = None
    kestra_config: KestraConfig | None = None
    version_provider: VersionProvider | None = None
    tenant_service: TenantService | None = None

    def load(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
