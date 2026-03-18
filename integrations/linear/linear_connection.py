from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-linear\src\main\java\io\kestra\plugin\linear\LinearConnection.java
# WARNING: Unresolved types: CompletableFuture, ObjectMapper

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.http.http_response import HttpResponse
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class LinearConnection(ABC, Task):
    l_i_n_e_a_r__a_p_i__u_r_l: ClassVar[str] = "https://api.linear.app/graphql"
    mapper: ClassVar[ObjectMapper] = JacksonMapper.ofJson()
    token: Property[str] | None = None

    def make_call(self, run_context: RunContext, query: str) -> HttpResponse[str]:
        raise NotImplementedError  # TODO: translate from Java

    def make_async_call(self, run_context: RunContext, query: str) -> CompletableFuture[HttpResponse[str]]:
        raise NotImplementedError  # TODO: translate from Java
