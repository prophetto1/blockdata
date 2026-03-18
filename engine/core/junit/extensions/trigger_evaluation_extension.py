from __future__ import annotations

# Source: E:\KESTRA\tests\src\main\java\io\kestra\core\junit\extensions\TriggerEvaluationExtension.java
# WARNING: Unresolved types: ExtensionContext, ParameterContext, ParameterResolver

from dataclasses import dataclass
from typing import Any, Optional

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow import Flow
from engine.core.runners.run_context_factory import RunContextFactory
from engine.core.runners.run_context_initializer import RunContextInitializer
from engine.core.models.triggers.trigger_context import TriggerContext


@dataclass(slots=True, kw_only=True)
class TriggerEvaluationExtension:
    context: ApplicationContext | None = None
    run_context_factory: RunContextFactory | None = None
    run_context_initializer: RunContextInitializer | None = None

    def supports_parameter(self, parameter_context: ParameterContext, extension_context: ExtensionContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def resolve_parameter(self, parameter_context: ParameterContext, extension_context: ExtensionContext) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def ensure_context(self, extension_context: ExtensionContext) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def evaluate_trigger(self, trigger: AbstractTrigger, flow: Flow) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def condition_context(self, trigger: AbstractTrigger, flow: Flow) -> ConditionContext:
        raise NotImplementedError  # TODO: translate from Java

    def trigger_context(self, trigger: AbstractTrigger, flow: Flow) -> TriggerContext:
        raise NotImplementedError  # TODO: translate from Java
