from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.n8n.content_type import ContentType
from engine.core.http.client.configurations.http_configuration import HttpConfiguration
from integrations.opensearch.model.http_method import HttpMethod
from engine.core.http.http_request import HttpRequest
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractTriggerWorkflow(Task):
    d_e_f_a_u_l_t__c_o_n_t_e_n_t__t_y_p_e: ContentType | None = None
    d_e_f_a_u_l_t__w_a_i_t: bool | None = None
    options: HttpConfiguration | None = None
    uri: Property[str]
    content_type: Property[ContentType] | None = None
    body: Property[dict[String, Any]] | None = None
    query_parameters: Property[dict[String, Any]] | None = None
    headers: Property[dict[String, Any]] | None = None
    from: Property[str] | None = None
    method: Property[HttpMethod]
    wait: Property[bool] | None = None

    def build_request(self, run_context: RunContext) -> HttpRequest:
        raise NotImplementedError  # TODO: translate from Java

    def build_uri(self, url: str, query_parameters: dict[String, Any]) -> str:
        raise NotImplementedError  # TODO: translate from Java
