from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-hightouch\src\main\java\io\kestra\plugin\hightouch\AbstractHightouchConnection.java
# WARNING: Unresolved types: Class, JavaTimeModule, ObjectMapper, RES

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.http.client.http_client_exception import HttpClientException
from engine.core.http.client.configurations.http_configuration import HttpConfiguration
from engine.core.http.http_response import HttpResponse
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractHightouchConnection(ABC, Task):
    token: Property[str]
    m_a_p_p_e_r: ClassVar[ObjectMapper] = new ObjectMapper()
        .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
        .registerModule(new JavaTimeModule())
    b_a_s_e__u_r_l: ClassVar[str] = "https://api.hightouch.com"
    options: HttpConfiguration | None = None

    def request(self, method: str, path: str, body: Any, response_type: Class[RES], run_context: RunContext) -> HttpResponse[RES]:
        raise NotImplementedError  # TODO: translate from Java
