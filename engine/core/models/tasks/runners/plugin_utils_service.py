from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\runners\PluginUtilsService.java
# WARNING: Unresolved types: Exception, IOException, JsonProcessingException, Logger, TypeReference

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from datetime import datetime
from typing import Any, ClassVar

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class PluginUtilsService(ABC):
    map_type_reference: ClassVar[TypeReference[dict[str, str]]]

    @staticmethod
    def create_output_files(temp_directory: Path, output_files: list[str], additional_vars: dict[str, Any]) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def create_output_files(temp_directory: Path, output_files: list[str], additional_vars: dict[str, Any], is_dir: bool) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def valid_filename(s: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def transform_input_files(run_context: RunContext, input_files: Any) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def transform_input_files(run_context: RunContext, additional_vars: dict[str, Any], input_files: Any) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def parse_out(line: str, logger: Logger, run_context: RunContext, is_std_err: bool, custom_instant: datetime) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def execution_from_task_parameters(run_context: RunContext, namespace: str, flow_id: str, execution_id: str) -> ExecutionInfo:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def create_input_files_internal(run_context: RunContext, working_directory: Path, input_files: dict[str, str], additional_vars: dict[str, Any], render: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def create_input_files(run_context: RunContext, working_directory: Path, input_files: dict[str, str], additional_vars: dict[str, Any]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def create_input_files_raw(run_context: RunContext, working_directory: Path, input_files: dict[str, str]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class ExecutionInfo:
        tenant_id: str | None = None
        namespace: str | None = None
        flow_id: str | None = None
        id: str | None = None
