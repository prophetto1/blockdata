from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.abstract_azure_identity_connection import AbstractAzureIdentityConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.redis.models.serde_type import SerdeType


@dataclass(slots=True, kw_only=True)
class AbstractServiceBusTask(AbstractAzureIdentityConnection):
    queue_name: Property[str] | None = None
    topic_name: Property[str] | None = None
    connection_string: Property[str] | None = None
    subscription_name: Property[str] | None = None
    serde_type: Property[SerdeType]
    d_e_f_a_u_l_t__s_e_r_d_e__t_y_p_e: SerdeType | None = None
    o_b_j_e_c_t__m_a_p_p_e_r: ObjectMapper | None = None
    q_u_e_u_e__n_a_m_e__d_e_s_c_r_i_p_t_i_o_n: str | None = None
    t_o_p_i_c__n_a_m_e__d_e_s_c_r_i_p_t_i_o_n: str | None = None
    c_o_n_n_e_c_t_i_o_n__s_t_r_i_n_g__d_e_s_c_r_i_p_t_i_o_n: str | None = None
    s_u_b_s_c_r_i_p_t_i_o_n__n_a_m_e__d_e_s_c_r_i_p_t_i_o_n: str | None = None
    s_e_r_d_e__t_y_p_e__d_e_s_c_r_i_p_t_i_o_n: str | None = None

    def apply_auth(self, run_context: RunContext, service_bus_client_builder: ServiceBusClientBuilder) -> ServiceBusClientBuilder:
        raise NotImplementedError  # TODO: translate from Java
