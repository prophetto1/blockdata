from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.http.http_response import HttpResponse
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class LinearConnection(Task):
    l_i_n_e_a_r__a_p_i__u_r_l: str | None = None
    mapper: ObjectMapper | None = None
    token: Property[str] | None = None

    def make_call(self, run_context: RunContext, query: str) -> HttpResponse[String]:
        raise NotImplementedError  # TODO: translate from Java

    def make_async_call(self, run_context: RunContext, query: str) -> CompletableFuture[HttpResponse[String]]:
        raise NotImplementedError  # TODO: translate from Java
