from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class OdooAuthenticator:
    url: str | None = None
    database: str | None = None
    username: str | None = None
    password: str | None = None
    common_client: XmlRpcClient | None = None

    def authenticate(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def get_version(self) -> java:
        raise NotImplementedError  # TODO: translate from Java
