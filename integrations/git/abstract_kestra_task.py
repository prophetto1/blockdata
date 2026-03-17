from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.git.abstract_git_task import AbstractGitTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractKestraTask(AbstractGitTask):
    d_e_f_a_u_l_t__k_e_s_t_r_a__u_r_l: str | None = None
    k_e_s_t_r_a__u_r_l__t_e_m_p_l_a_t_e: str | None = None
    kestra_url: Property[str] | None = None
    auth: Auth

    def kestra_client(self, run_context: RunContext) -> KestraClient:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Auth:
        username: Property[str] | None = None
        password: Property[str] | None = None
        auto: Property[bool] | None = None


@dataclass(slots=True, kw_only=True)
class Auth:
    username: Property[str] | None = None
    password: Property[str] | None = None
    auto: Property[bool] | None = None
