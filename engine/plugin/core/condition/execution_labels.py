from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\condition\ExecutionLabels.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.conditions.condition import Condition
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.exceptions.internal_exception import InternalException
from engine.core.models.label import Label
from engine.core.serializers.list_or_map_of_label_deserializer import ListOrMapOfLabelDeserializer
from engine.core.serializers.list_or_map_of_label_serializer import ListOrMapOfLabelSerializer


@dataclass(slots=True, kw_only=True)
class ExecutionLabels(Condition):
    """Match executions by label set."""
    labels: list[@NoSystemLabelValidation Label]

    def test(self, condition_context: ConditionContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java
