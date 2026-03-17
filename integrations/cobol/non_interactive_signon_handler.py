from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-cobol\src\main\java\io\kestra\plugin\cobol\NonInteractiveSignonHandler.java
# WARNING: Unresolved types: SignonEvent, SignonHandlerAdapter

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class NonInteractiveSignonHandler(SignonHandlerAdapter):

    def password_about_to_expire(self, event: SignonEvent, days_until_expiration: int) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def password_expired(self, event: SignonEvent) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def connection_initiated(self, event: SignonEvent, force_update: bool) -> bool:
        raise NotImplementedError  # TODO: translate from Java
