from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class ActorRunMeta:
    origin: str | None = None
    client_ip: str | None = None
    user_agent: str | None = None

    def get_client_ip(self) -> Optional[String]:
        raise NotImplementedError  # TODO: translate from Java
