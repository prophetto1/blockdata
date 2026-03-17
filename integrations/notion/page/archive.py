from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opensearch.abstract_task import AbstractTask
from engine.core.models.tasks.output import Output
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Archive(AbstractTask):
    """Archive a Notion page"""

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def get_endpoint(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
