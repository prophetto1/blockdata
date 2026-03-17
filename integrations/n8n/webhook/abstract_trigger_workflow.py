from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-n8n\src\main\java\io\kestra\plugin\n8n\webhook\AbstractTriggerWorkflow.java
# WARNING: Unresolved types: Exception, HttpRequestBuilder, IOException, URISyntaxException

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.n8n.content_type import ContentType
from engine.core.http.client.configurations.http_configuration import HttpConfiguration
from integrations.elasticsearch.model.http_method import HttpMethod
from engine.core.http.http_request import HttpRequest
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractTriggerWorkflow(ABC, Task):
    uri: Property[str]
    method: Property[HttpMethod]
    d_e_f_a_u_l_t__c_o_n_t_e_n_t__t_y_p_e: ClassVar[ContentType] = ContentType.BINARY
    d_e_f_a_u_l_t__w_a_i_t: ClassVar[bool] = True
    content_type: Property[ContentType] = Property.ofValue(ContentType.BINARY)
    wait: Property[bool] = Property.ofValue(DEFAULT_WAIT)
    options: HttpConfiguration | None = None
    body: Property[dict[str, Any]] | None = None
    query_parameters: Property[dict[str, Any]] | None = None
    headers: Property[dict[str, Any]] | None = None
    from: Property[str] | None = None

    def build_request(self, run_context: RunContext) -> HttpRequest:
        raise NotImplementedError  # TODO: translate from Java

    def build_uri(self, url: str, query_parameters: dict[str, Any]) -> str:
        raise NotImplementedError  # TODO: translate from Java
