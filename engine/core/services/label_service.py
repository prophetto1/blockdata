from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\services\LabelService.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.models.label import Label
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class LabelService:

    @staticmethod
    def labels_excluding_system(labels: list[Label]) -> list[Label]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from_trigger(run_context: RunContext, flow: FlowInterface, trigger: AbstractTrigger) -> list[Label]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def render_label_value(run_context: RunContext, label: Label) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def contains_all(labels_container: list[Label], labels_that_must_be_included: list[Label]) -> bool:
        raise NotImplementedError  # TODO: translate from Java
