from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\FlowInputOutput.java
# WARNING: Unresolved types: AbstractMap, CompletedPart, Publisher, SimpleEntry

from dataclasses import dataclass, field
from typing import Any, ClassVar, Optional

from engine.core.models.flows.data import Data
from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.flows.input import Input
from engine.core.models.flows.input.input_and_value import InputAndValue
from engine.core.exceptions.input_output_validation_exception import InputOutputValidationException
from engine.core.models.property.property_context import PropertyContext
from engine.core.runners.run_context import RunContext
from engine.core.runners.run_context_factory import RunContextFactory
from engine.core.storages.storage_interface import StorageInterface
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class FlowInputOutput:
    yaml_mapper: ClassVar[ObjectMapper]
    storage_interface: StorageInterface | None = None
    secret_key: Optional[str] | None = None
    run_context_factory: RunContextFactory | None = None

    def validate_execution_inputs(self, inputs: list[Input[Any]], flow: FlowInterface, execution: Execution, data: Publisher[CompletedPart]) -> Mono[list[InputAndValue]]:
        raise NotImplementedError  # TODO: translate from Java

    def read_execution_inputs(self, inputs: list[Input[Any]], flow: FlowInterface, execution: Execution, data: Publisher[CompletedPart] | None = None) -> Mono[dict[str, Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def read_data(self, inputs: list[Input[Any]], execution: Execution, data: Publisher[CompletedPart], upload_files: bool) -> Mono[dict[str, Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def resolve_inputs(self, inputs: list[Input[Any]], flow: FlowInterface, execution: Execution, data: dict[str, Any], decrypt_secrets: bool | None = None) -> list[InputAndValue]:
        raise NotImplementedError  # TODO: translate from Java

    def resolve_input_value(self, resolvable: ResolvableInput, flow: FlowInterface, execution: Execution, inputs: dict[str, ResolvableInput], decrypt_secrets: bool) -> InputAndValue:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def resolve_default_value(input: Input[Any], renderer: PropertyContext) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def resolve_default_property_as(input: Input[Any], renderer: PropertyContext, clazz: type[T]) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def resolve_default_property_as_list(input: Input[Any], renderer: PropertyContext, clazz: type[T]) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    def build_run_context_for_execution_and_inputs(self, flow: FlowInterface, execution: Execution, dependencies: dict[str, InputAndValue], decrypt_secrets: bool) -> RunContext:
        raise NotImplementedError  # TODO: translate from Java

    def resolve_all_dependent_inputs(self, input: Input[Any], flow: FlowInterface, execution: Execution, inputs: dict[str, ResolvableInput], decrypt_secrets: bool) -> dict[str, InputAndValue]:
        raise NotImplementedError  # TODO: translate from Java

    def typed_outputs(self, flow: FlowInterface, execution: Execution, in: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    def parse_data(self, execution: Execution, data: Data, current: Any) -> Optional[AbstractMap.SimpleEntry[str, Any]]:
        raise NotImplementedError  # TODO: translate from Java

    def parse_type(self, execution: Execution, type: Type, id: str, element_type: Type, current: Any, data: Data) -> Any:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ResolvableInput:
        input: InputAndValue | None = None
        is_resolved: bool | None = None

        @staticmethod
        def of(input: Input[Any], value: Any) -> ResolvableInput:
            raise NotImplementedError  # TODO: translate from Java

        def get(self) -> InputAndValue:
            raise NotImplementedError  # TODO: translate from Java

        def is_default(self, is_default: bool) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def resolve_with_enabled(self, enabled: bool) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def resolve_with_value(self, value: Any) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def resolve_with_error(self, exception: set[InputOutputValidationException]) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def mark_as_resolved(self) -> None:
            raise NotImplementedError  # TODO: translate from Java

        def is_resolved(self) -> bool:
            raise NotImplementedError  # TODO: translate from Java
