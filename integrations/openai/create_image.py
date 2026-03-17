from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-openai\src\main\java\io\kestra\plugin\openai\CreateImage.java
# WARNING: Unresolved types: Exception, IOException, ImageGenerateParams, core, io, kestra, models, tasks

from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Any

from integrations.compress.abstract_task import AbstractTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.plugin.core.storage.size import Size


@dataclass(slots=True, kw_only=True)
class CreateImage(AbstractTask):
    """Generate images with OpenAI"""
    prompt: Property[str]
    size: Property[SIZE] = Property.ofValue(SIZE.LARGE)
    download: Property[bool] = Property.ofValue(Boolean.FALSE)
    n: int | None = None

    def run(self, run_context: RunContext) -> CreateImage.Output:
        raise NotImplementedError  # TODO: translate from Java

    def download_b64_json(self, encoded_image: str) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        images: list[str] | None = None

    class SIZE(str, Enum):
        SMALL = "SMALL"
        MEDIUM = "MEDIUM"
        LARGE = "LARGE"
