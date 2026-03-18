from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-datagen\src\main\java\io\kestra\plugin\datagen\core\Generate.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.datagen.batch_generate_interface import BatchGenerateInterface
from integrations.datagen.data import Data
from integrations.datagen.model.data_generator import DataGenerator
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class Generate(Task):
    """Generate synthetic data"""
    store: Property[bool] = Property.ofValue(DEFAULT_STORE)
    batch_size: Property[int] = Property.ofValue(DEFAULT_BATCH_SIZE)
    generator: DataGenerator[Any] | None = None

    def run(self, run_context: RunContext) -> Data:
        raise NotImplementedError  # TODO: translate from Java
