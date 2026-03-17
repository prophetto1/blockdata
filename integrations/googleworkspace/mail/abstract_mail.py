from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.http.http_request import HttpRequest
from integrations.googleworkspace.o_auth_interface import OAuthInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractMail(Task, OAuthInterface):
    j_s_o_n__f_a_c_t_o_r_y: JsonFactory | None = None
    client_id: Property[str]
    client_secret: Property[str]
    refresh_token: Property[str]
    access_token: Property[str] | None = None
    scopes: Property[list[String]] | None = None
    read_timeout: Property[int] | None = None

    def connection(self, run_context: RunContext) -> Gmail:
        raise NotImplementedError  # TODO: translate from Java

    def oauth_credentials(self, run_context: RunContext) -> HttpCredentialsAdapter:
        raise NotImplementedError  # TODO: translate from Java

    def net_http_transport(self) -> NetHttpTransport:
        raise NotImplementedError  # TODO: translate from Java
