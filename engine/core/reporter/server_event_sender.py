from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\reporter\ServerEventSender.java
# WARNING: Unresolved types: Exception, MutableHttpRequest, ObjectMapper, ReactorHttpClient

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, ClassVar

from engine.core.services.instance_service import InstanceService
from engine.core.models.collectors.result import Result
from engine.core.reporter.server_event import ServerEvent
from engine.core.models.server_type import ServerType
from engine.core.models.flows.type import Type
from engine.core.utils.version_provider import VersionProvider


@dataclass(slots=True, kw_only=True)
class ServerEventSender:
    s_e_s_s_i_o_n__u_u_i_d: ClassVar[str] = IdUtils.create()
    o_b_j_e_c_t__m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson()
    client: ReactorHttpClient | None = None
    version_provider: VersionProvider | None = None
    instance_service: InstanceService | None = None
    server_type: ServerType | None = None
    url: str | None = None

    def send(self, now: datetime, type: Type, event: Any) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def handle_response(self, result: Result) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def request(self, event: ServerEvent, type: Type) -> MutableHttpRequest[ServerEvent]:
        raise NotImplementedError  # TODO: translate from Java
