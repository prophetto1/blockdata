from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\validations\validator\FlowValidator.java
# WARNING: Unresolved types: AnnotationValue, ConstraintValidator, ConstraintValidatorContext, Pattern

from dataclasses import dataclass
from typing import Any, Optional

from engine.core.models.flows.flow import Flow
from engine.core.services.flow_service import FlowService
from engine.core.validations.flow_validation import FlowValidation
from engine.core.services.namespace_service import NamespaceService
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class FlowValidator:
    r_e_s_e_r_v_e_d__f_l_o_w__i_d_s: list[str] = List.of(
        "pause",
        "resume",
        "force-run",
        "change-status",
        "kill",
        "executions",
        "search",
        "source",
        "disable",
        "enable"
    )
    flow_service: FlowService | None = None
    namespace_service: NamespaceService | None = None

    def is_valid(self, value: Flow, annotation_metadata: AnnotationValue[FlowValidation], context: ConstraintValidatorContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def assets_violations(self, all_tasks: list[Task]) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def check_object_fields_with_patterns(object: Any, patterns: list[Pattern]) -> bool:
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
        def find_cycle(id: str, graph: dict[str, list[str]]) -> Optional[list[str]]:
            raise NotImplementedError  # TODO: translate from Java

        @staticmethod
        def find_cycle(id: str, graph: dict[str, list[str]], visiting: set[str], visited: set[str], path: list[str]) -> Optional[list[str]]:
            raise NotImplementedError  # TODO: translate from Java
