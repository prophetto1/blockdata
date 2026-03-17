from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-apify\src\main\java\io\kestra\plugin\apify\actor\ActorRunMeta.java

from dataclasses import dataclass
from typing import Any, Optional


@dataclass(slots=True, kw_only=True)
class ActorRunMeta:
    origin: str | None = None
    client_ip: str | None = None
    user_agent: str | None = None

    def get_client_ip(self) -> Optional[str]:
        raise NotImplementedError  # TODO: translate from Java
