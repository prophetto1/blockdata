from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractPgp(Task):

    def add_provider(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
