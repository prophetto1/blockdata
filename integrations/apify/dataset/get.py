from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.apify.dataset.abstract_get_dataset import AbstractGetDataset
from engine.core.models.tasks.output import Output
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Get(AbstractGetDataset, RunnableTask):
    """Fetch Apify dataset items"""

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java
