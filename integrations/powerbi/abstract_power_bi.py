from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-powerbi\src\main\java\io\kestra\plugin\powerbi\AbstractPowerBi.java
# WARNING: Unresolved types: Class, REQ, RES

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.http.client.http_client_exception import HttpClientException
from engine.core.http.client.configurations.http_configuration import HttpConfiguration
from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractPowerBi(ABC, Task):
    tenant_id: str
    client_id: str
    client_secret: str
    l_o_g_i_n__u_r_l: str = "https://login.microsoftonline.com"
    a_p_i__u_r_l: str = "https://api.powerbi.com/"
    options: HttpConfiguration | None = None
    token: str | None = None

    def token(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def request(self, run_context: RunContext, request: HttpRequest, response_type: Class[RES]) -> HttpResponse[RES]:
        raise NotImplementedError  # TODO: translate from Java
