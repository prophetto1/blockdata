from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.apify.actor.actor_run import ActorRun


@dataclass(slots=True, kw_only=True)
class ActorRunApiResponseWrapper:
    data: ActorRun | None = None
