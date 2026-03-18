from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-trello\src\main\java\io\kestra\plugin\trello\cards\Comment.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.trello.abstract_trello_task import AbstractTrelloTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Comment(AbstractTrelloTask):
    """Add a comment to a Trello card"""
    card_id: Property[str]
    text: Property[str]

    def run(self, run_context: RunContext) -> io.kestra.core.models.tasks.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        comment_id: str | None = None
