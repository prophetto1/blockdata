from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-cloudflare\src\main\java\io\kestra\plugin\cloudflare\AbstractCloudflareTask.java
# WARNING: Unresolved types: HttpRequestBuilder, ObjectMapper, RES, TypeReference

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, ClassVar

from engine.core.http.client.http_client_exception import HttpClientException
from engine.core.http.client.configurations.http_configuration import HttpConfiguration
from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractCloudflareTask(ABC, Task):
    api_token: Property[str]
    m_a_p_p_e_r: ClassVar[ObjectMapper] = new ObjectMapper()
        .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
    base_url: Property[str] = Property.ofValue("https://api.cloudflare.com/client/v4")
    options: HttpConfiguration | None = None

    def request(self, run_context: RunContext, request_builder: HttpRequest.HttpRequestBuilder, type_reference: TypeReference[RES]) -> HttpResponse[RES]:
        raise NotImplementedError  # TODO: translate from Java

    class DnsRecordType(str, Enum):
        """Record Type"""
        A = "A"
        AAAA = "AAAA"
        CNAME = "CNAME"
        TXT = "TXT"
        MX = "MX"
        NS = "NS"
        SRV = "SRV"
        PTR = "PTR"
        CAA = "CAA"
        SOA = "SOA"
