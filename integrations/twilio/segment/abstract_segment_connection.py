from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-twilio\src\main\java\io\kestra\plugin\twilio\segment\AbstractSegmentConnection.java
# WARNING: Unresolved types: Class, IOException, ObjectMapper, T

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.http.client.http_client_exception import HttpClientException
from engine.core.http.http_response import HttpResponse
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractSegmentConnection(ABC, Task):
    token: Property[str]
    m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson()
    b_a_s_e__u_r_l: ClassVar[str] = "https://api.segmentapis.com"
    uri: Property[str] = Property.ofValue(BASE_URL)

    def request(self, run_context: RunContext, method: str, path: str, body: Any, response_type: Class[T]) -> HttpResponse[T]:
        raise NotImplementedError  # TODO: translate from Java
