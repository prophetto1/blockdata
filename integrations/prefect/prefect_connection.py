from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-prefect\src\main\java\io\kestra\plugin\prefect\PrefectConnection.java
# WARNING: Unresolved types: Builder

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.http.client.http_client import HttpClient
from engine.core.http.http_request import HttpRequest
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class PrefectConnection:
    p_r_e_f_e_c_t__c_l_o_u_d__a_p_i__b_a_s_e__u_r_l: ClassVar[str] = "https://api.prefect.cloud/api"
    api_url: Property[str] = Property.of(PREFECT_CLOUD_API_BASE_URL)
    api_key: Property[str] | None = None
    account_id: Property[str] | None = None
    workspace_id: Property[str] | None = None

    def request(self, run_context: RunContext, path: str) -> HttpRequest.Builder:
        raise NotImplementedError  # TODO: translate from Java

    def is_cloud(self) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def http_client() -> HttpClient:
        raise NotImplementedError  # TODO: translate from Java
