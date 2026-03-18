from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-apify\src\main\java\io\kestra\plugin\apify\dataset\Get.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.apify.dataset.abstract_get_dataset import AbstractGetDataset
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Get(AbstractGetDataset):
    """Fetch Apify dataset items"""

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        dataset: list[Any] | None = None
