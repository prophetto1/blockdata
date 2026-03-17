from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kestra\src\main\java\io\kestra\plugin\kestra\AbstractKestraTrigger.java
# WARNING: Unresolved types: KestraClient

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractKestraTrigger(ABC, AbstractTrigger):
    d_e_f_a_u_l_t__k_e_s_t_r_a__u_r_l: ClassVar[str] = "http://localhost:8080"
    k_e_s_t_r_a__u_r_l__t_e_m_p_l_a_t_e: ClassVar[str] = "{{ kestra.url }}"
    kestra_url: Property[str] | None = None
    auth: Auth | None = None
    tenant_id: Property[str] | None = None

    def kestra_client(self, run_context: RunContext) -> KestraClient:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Auth:
        auto: Property[bool] = Property.ofValue(Boolean.TRUE)
        api_token: Property[str] | None = None
        username: Property[str] | None = None
        password: Property[str] | None = None
