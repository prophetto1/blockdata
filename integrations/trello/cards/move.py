from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-trello\src\main\java\io\kestra\plugin\trello\cards\Move.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.trello.abstract_trello_task import AbstractTrelloTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Move(AbstractTrelloTask):
    """Move a Trello card between lists"""
    card_id: Property[str]
    list_id: Property[str]
    pos: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
