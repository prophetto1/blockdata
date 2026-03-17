from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.triggers.abstract_trigger import AbstractTrigger


@dataclass(slots=True, kw_only=True)
class Sync(AbstractTrigger):
    """Sync an Airbyte Cloud job."""

    def sync_type(self) -> JobTypeEnum:
        raise NotImplementedError  # TODO: translate from Java
