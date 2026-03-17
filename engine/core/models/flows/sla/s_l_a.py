from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\sla\SLA.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.executions.execution import Execution
from engine.core.models.flows.sla.types.execution_assertion_s_l_a import ExecutionAssertionSLA
from engine.core.exceptions.internal_exception import InternalException
from engine.core.models.label import Label
from engine.core.serializers.list_or_map_of_label_deserializer import ListOrMapOfLabelDeserializer
from engine.core.serializers.list_or_map_of_label_serializer import ListOrMapOfLabelSerializer
from engine.core.models.flows.sla.types.max_duration_s_l_a import MaxDurationSLA
from engine.core.runners.run_context import RunContext
from engine.core.models.flows.sla.violation import Violation


@dataclass(slots=True, kw_only=True)
class SLA:
    id: str
    type: SLA.Type
    behavior: Behavior
    labels: list[@NoSystemLabelValidation Label] | None = None

    def evaluate(self, run_context: RunContext, execution: Execution) -> Optional[Violation]:
        raise NotImplementedError  # TODO: translate from Java

    class Type(str, Enum):
        MAX_DURATION = "MAX_DURATION"
        EXECUTION_ASSERTION = "EXECUTION_ASSERTION"

    class Behavior(str, Enum):
        FAIL = "FAIL"
        CANCEL = "CANCEL"
        NONE = "NONE"
