from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\BasicAuthCredentials.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class BasicAuthCredentials:
    uid: str | None = None
    username: str | None = None
    password: str | None = None

    def get_username(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_password(self) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_uid(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
