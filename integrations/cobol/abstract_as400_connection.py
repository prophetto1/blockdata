from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.cobol.as400_connection_interface import As400ConnectionInterface
from integrations.slack.app.models.message_output import MessageOutput
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractAs400Connection(Task, As400ConnectionInterface):
    s_i_m_p_l_e__o_b_j_e_c_t__n_a_m_e__p_a_t_t_e_r_n: Pattern | None = None
    q_u_a_l_i_f_i_e_d__o_b_j_e_c_t__n_a_m_e__p_a_t_t_e_r_n: Pattern | None = None
    host: Property[str]
    user: Property[str]
    password: Property[str]

    def connect(self, run_context: RunContext) -> AS400:
        raise NotImplementedError  # TODO: translate from Java

    def extract_messages(self, message_list: AS400Message) -> list[MessageOutput]:
        raise NotImplementedError  # TODO: translate from Java

    def require_simple_object_name(self, value: str, field_name: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def require_qualified_object_name(self, value: str, field_name: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def escape_cl_string_literal(self, value: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
