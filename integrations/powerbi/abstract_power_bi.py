from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.http.client.configurations.http_configuration import HttpConfiguration
from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractPowerBi(Task):
    l_o_g_i_n__u_r_l: str | None = None
    a_p_i__u_r_l: str | None = None
    tenant_id: str
    client_id: str
    client_secret: str
    options: HttpConfiguration | None = None
    token: str | None = None

    def token(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def request(self, run_context: RunContext, request: HttpRequest, response_type: Class[RES]) -> HttpResponse[RES]:
        raise NotImplementedError  # TODO: translate from Java
