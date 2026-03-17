from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any
from pathlib import Path

from integrations.opensearch.abstract_task import AbstractTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


class SIZE(str, Enum):
    SMALL = "SMALL"
    MEDIUM = "MEDIUM"
    LARGE = "LARGE"


@dataclass(slots=True, kw_only=True)
class CreateImage(AbstractTask, RunnableTask):
    """Generate images with OpenAI"""
    prompt: Property[str]
    n: int | None = None
    size: Property[SIZE]
    download: Property[bool]

    def run(self, run_context: RunContext) -> CreateImage:
        raise NotImplementedError  # TODO: translate from Java

    def download_b64_json(self, encoded_image: str) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        images: list[URI] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    images: list[URI] | None = None
