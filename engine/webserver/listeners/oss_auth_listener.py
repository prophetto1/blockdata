from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\listeners\OssAuthListener.java

from dataclasses import dataclass
from typing import Any

from engine.core.http.client.http_client import HttpClient
from engine.webserver.models.events.oss_auth_event import OssAuthEvent


@dataclass(slots=True, kw_only=True)
class OssAuthListener:
    http_client: HttpClient | None = None

    def on_oss_auth(self, event: OssAuthEvent) -> None:
        raise NotImplementedError  # TODO: translate from Java
