from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-datagen\src\main\java\io\kestra\plugin\datagen\model\DataGenerator.java
# WARNING: Unresolved types: T

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.plugins.additional_plugin import AdditionalPlugin
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.plugins.serdes.plugin_deserializer import PluginDeserializer
from integrations.datagen.model.producer import Producer
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class DataGenerator(ABC, AdditionalPlugin):
    run_context: RunContext | None = None

    def init(self, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java
