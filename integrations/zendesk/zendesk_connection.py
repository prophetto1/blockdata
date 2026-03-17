from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class ZendeskConnection(Task):
    mapper: ObjectMapper | None = None
    z_e_n_d_e_s_k__u_r_l__f_o_r_m_a_t: str | None = None
    domain: Property[str]
    username: Property[str] | None = None
    token: Property[str] | None = None
    oauth_token: Property[str] | None = None

    def make_call(self, run_context: RunContext, body: str, clazz: Class[T]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def get_authorization_header(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def normalise_base(self, base: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
