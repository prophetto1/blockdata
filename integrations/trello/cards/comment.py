from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.trello.abstract_trello_task import AbstractTrelloTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Comment(AbstractTrelloTask):
    """Add a comment to a Trello card"""
    card_id: Property[str]
    text: Property[str]

    def run(self, run_context: RunContext) -> io:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        comment_id: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    comment_id: str | None = None
