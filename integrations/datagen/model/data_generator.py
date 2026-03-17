from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.plugins.additional_plugin import AdditionalPlugin
from integrations.datagen.model.producer import Producer
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class DataGenerator(AdditionalPlugin, Producer):
    run_context: RunContext | None = None

    def init(self, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java
