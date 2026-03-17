from __future__ import annotations

# Source: E:\KESTRA\executor\src\main\java\io\kestra\executor\FlowTriggerService.java
# WARNING: Unresolved types: Stream, core, io, kestra, plugin, trigger

from dataclasses import dataclass
from typing import Any

from engine.core.services.condition_service import ConditionService
from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow import Flow
from engine.core.services.flow_service import FlowService
from engine.core.models.flows.flow_with_source import FlowWithSource
from engine.core.models.triggers.multipleflows.multiple_condition import MultipleCondition
from engine.core.models.triggers.multipleflows.multiple_condition_storage_interface import MultipleConditionStorageInterface
from engine.core.models.triggers.multipleflows.multiple_condition_window import MultipleConditionWindow
from engine.core.runners.run_context_factory import RunContextFactory


@dataclass(slots=True, kw_only=True)
class FlowTriggerService:
    condition_service: ConditionService | None = None
    run_context_factory: RunContextFactory | None = None
    flow_service: FlowService | None = None

    def with_flow_triggers_only(self, all_flows: Stream[FlowWithSource]) -> Stream[FlowWithFlowTrigger]:
        raise NotImplementedError  # TODO: translate from Java

    def flow_triggers(self, flow: Flow) -> Stream[io.kestra.plugin.core.trigger.Flow]:
        raise NotImplementedError  # TODO: translate from Java

    def compute_executions_from_flow_trigger_conditions(self, execution: Execution, flow: Flow) -> list[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def compute_executions_from_flow_trigger_preconditions(self, execution: Execution, flow: Flow, multiple_condition_storage: MultipleConditionStorageInterface) -> list[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def compute_flow_triggers(self, execution: Execution, flow: Flow) -> list[FlowWithFlowTrigger]:
        raise NotImplementedError  # TODO: translate from Java

    def flow_trigger_multiple_conditions(self, flow_with_flow_trigger: FlowWithFlowTrigger) -> Stream[MultipleCondition]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class FlowWithFlowTriggerAndMultipleCondition:
        flow: Flow | None = None
        multiple_condition_window: MultipleConditionWindow | None = None
        trigger: io.kestra.plugin.core.trigger.Flow | None = None
        multiple_condition: MultipleCondition | None = None

    @dataclass(slots=True)
    class FlowWithFlowTrigger:
        flow: Flow | None = None
        trigger: io.kestra.plugin.core.trigger.Flow | None = None
