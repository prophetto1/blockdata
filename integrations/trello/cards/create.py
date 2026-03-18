from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-trello\src\main\java\io\kestra\plugin\trello\cards\Create.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.trello.abstract_trello_task import AbstractTrelloTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Create(AbstractTrelloTask):
    """Create a new Trello card"""
    name: Property[str]
    list_id: Property[str]
    desc: Property[str] | None = None
    pos: Property[str] | None = None
    due: Property[str] | None = None

    def run(self, run_context: RunContext) -> io.kestra.core.models.tasks.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        card_id: str | None = None
