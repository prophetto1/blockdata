from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\RunContextSDKFactory.java
# WARNING: Unresolved types: ApplicationContext, Auth

from dataclasses import dataclass
from typing import Any

from engine.core.runners.run_context import RunContext
from engine.core.runners.s_d_k import SDK


@dataclass(slots=True, kw_only=True)
class RunContextSDKFactory:

    def create(self, application_context: ApplicationContext, run_context: RunContext) -> SDK:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class SDKImpl:
        a_u_t_h__p_r_o_p: str = "kestra.tasks.sdk.authentication"
        a_p_i__t_o_k_e_n__p_r_o_p: str = AUTH_PROP + ".api-token"
        u_s_e_r_n_a_m_e__p_r_o_p: str = AUTH_PROP + ".username"
        p_a_s_s_w_o_r_d__p_r_o_p: str = AUTH_PROP + ".password"
        sdk_authentication: Auth | None = None

        def default_authentication(self) -> Optional[Auth]:
            raise NotImplementedError  # TODO: translate from Java
