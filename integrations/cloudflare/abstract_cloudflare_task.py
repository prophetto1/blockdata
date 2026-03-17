from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from engine.core.http.client.configurations.http_configuration import HttpConfiguration
from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


class DnsRecordType(str, Enum):
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


@dataclass(slots=True, kw_only=True)
class AbstractCloudflareTask(Task):
    m_a_p_p_e_r: ObjectMapper | None = None
    api_token: Property[str]
    base_url: Property[str] | None = None
    options: HttpConfiguration | None = None

    def request(self, run_context: RunContext, request_builder: HttpRequest, type_reference: TypeReference[RES]) -> HttpResponse[RES]:
        raise NotImplementedError  # TODO: translate from Java
