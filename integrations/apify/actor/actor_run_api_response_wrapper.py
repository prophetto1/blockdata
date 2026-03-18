from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-apify\src\main\java\io\kestra\plugin\apify\actor\ActorRunApiResponseWrapper.java

from dataclasses import dataclass
from typing import Any

from integrations.apify.actor.actor_run import ActorRun


@dataclass(slots=True, kw_only=True)
class ActorRunApiResponseWrapper:
    data: ActorRun | None = None
