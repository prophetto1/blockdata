from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\FlowValidator.java

from dataclasses import dataclass
from typing import Any, Optional

from engine.core.models.flows.flow import Flow
from engine.core.services.flow_service import FlowService
from engine.core.validations.flow_validation import FlowValidation
from engine.core.services.namespace_service import NamespaceService
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class FlowValidator:
    reserved_flow_ids: list[str]
    flow_service: FlowService | None = None
    namespace_service: NamespaceService | None = None

    def is_valid(self, value: Flow, annotation_metadata: AnnotationValue[FlowValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def assets_violations(self, all_tasks: list[Task]) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def check_object_fields_with_patterns(object: Any, patterns: list[re.Pattern]) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def check_flow_inputs_dependency_graph(flow: Flow, violations: list[str]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_duplicates(task_ids: list[str]) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class CycleDependency:

        @staticmethod
        def find_cycle(id: str, graph: dict[str, list[str]], visiting: set[str] | None = None, visited: set[str] | None = None, path: list[str] | None = None) -> Optional[list[str]]:
            raise NotImplementedError  # TODO: translate from Java
