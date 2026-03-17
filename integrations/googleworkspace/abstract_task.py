from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.googleworkspace.gcp_interface import GcpInterface
from engine.core.http.http_request import HttpRequest
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractTask(Task, GcpInterface):
    j_s_o_n__f_a_c_t_o_r_y: JsonFactory | None = None
    service_account: Property[str] | None = None
    read_timeout: Property[int] | None = None

    def credentials(self, run_context: RunContext) -> HttpCredentialsAdapter:
        raise NotImplementedError  # TODO: translate from Java

    def net_http_transport(self) -> NetHttpTransport:
        raise NotImplementedError  # TODO: translate from Java
