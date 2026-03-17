from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.http.client.configurations.http_configuration import HttpConfiguration
from engine.core.http.http_response import HttpResponse
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractHightouchConnection(Task):
    m_a_p_p_e_r: ObjectMapper | None = None
    b_a_s_e__u_r_l: str | None = None
    token: Property[str]
    options: HttpConfiguration | None = None

    def request(self, method: str, path: str, body: Any, response_type: Class[RES], run_context: RunContext) -> HttpResponse[RES]:
        raise NotImplementedError  # TODO: translate from Java
