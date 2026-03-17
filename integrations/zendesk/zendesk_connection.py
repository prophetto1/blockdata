from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-zendesk\src\main\java\io\kestra\plugin\zendesk\ZendeskConnection.java
# WARNING: Unresolved types: Class, Exception, ObjectMapper, T

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class ZendeskConnection(ABC, Task):
    domain: Property[str]
    mapper: ClassVar[ObjectMapper] = JacksonMapper.ofJson()
    z_e_n_d_e_s_k__u_r_l__f_o_r_m_a_t: ClassVar[str] = "%s/api/v2/tickets.json"
    username: Property[str] | None = None
    token: Property[str] | None = None
    oauth_token: Property[str] | None = None

    def make_call(self, run_context: RunContext, body: str, clazz: Class[T]) -> T:
        raise NotImplementedError  # TODO: translate from Java

    def get_authorization_header(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def normalise_base(base: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
