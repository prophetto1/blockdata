from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\runners\ScriptService.java

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, ClassVar

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runners.target_os import TargetOS


@dataclass(slots=True, kw_only=True)
class ScriptService:
    internal_storage_pattern: ClassVar[re.Pattern]
    var_working_dir: ClassVar[str] = "workingDir"
    var_output_dir: ClassVar[str] = "outputDir"
    var_bucket_path: ClassVar[str] = "bucketPath"
    env_working_dir: ClassVar[str] = "WORKING_DIR"
    env_output_dir: ClassVar[str] = "OUTPUT_DIR"
    env_bucket_path: ClassVar[str] = "BUCKET_PATH"

    @staticmethod
    def replace_internal_storage(run_context: RunContext, additional_vars: dict[str, Any], command: str | None = None, replace_with_relative_path: bool | None = None) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def save_on_local_storage(run_context: RunContext, uri: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def upload_output_files(run_context: RunContext, output_dir: Path) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def script_commands(interpreter: list[str], before_commands: list[str], command: str, target_os: TargetOS | None = None) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def labels(run_context: RunContext, prefix: str, normalize_value: bool | None = None, lower_case: bool | None = None) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def with_prefix(name: str, prefix: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def normalize_value(value: str, normalize_value: bool, lower_case: bool) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def normalize(string: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def job_name(run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java
