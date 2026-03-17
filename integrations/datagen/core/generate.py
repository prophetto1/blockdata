from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.datagen.batch_generate_interface import BatchGenerateInterface
from engine.core.models.property.data import Data
from integrations.datagen.model.data_generator import DataGenerator
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class Generate(Task, RunnableTask, BatchGenerateInterface):
    """Generate synthetic data"""
    generator: DataGenerator[Any] | None = None
    store: Property[bool] | None = None
    batch_size: Property[int] | None = None

    def run(self, run_context: RunContext) -> Data:
        raise NotImplementedError  # TODO: translate from Java
