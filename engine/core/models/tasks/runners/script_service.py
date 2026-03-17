from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\runners\ScriptService.java
# WARNING: Unresolved types: IOException, Pattern

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, ClassVar

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runners.target_o_s import TargetOS


@dataclass(slots=True, kw_only=True)
class ScriptService:
    i_n_t_e_r_n_a_l__s_t_o_r_a_g_e__p_a_t_t_e_r_n: ClassVar[Pattern] = Pattern.compile("(kestra:\\/\\/[-\\p{Alnum}._\\+~#=/]*)", Pattern.UNICODE_CHARACTER_CLASS)
    v_a_r__w_o_r_k_i_n_g__d_i_r: ClassVar[str] = "workingDir"
    v_a_r__o_u_t_p_u_t__d_i_r: ClassVar[str] = "outputDir"
    v_a_r__b_u_c_k_e_t__p_a_t_h: ClassVar[str] = "bucketPath"
    e_n_v__w_o_r_k_i_n_g__d_i_r: ClassVar[str] = "WORKING_DIR"
    e_n_v__o_u_t_p_u_t__d_i_r: ClassVar[str] = "OUTPUT_DIR"
    e_n_v__b_u_c_k_e_t__p_a_t_h: ClassVar[str] = "BUCKET_PATH"

    @staticmethod
    def replace_internal_storage(run_context: RunContext, command: str, replace_with_relative_path: bool) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def replace_internal_storage(run_context: RunContext, additional_vars: dict[str, Any], command: str, replace_with_relative_path: bool) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def replace_internal_storage(run_context: RunContext, additional_vars: dict[str, Any], commands: list[str], replace_with_relative_path: bool) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def replace_internal_storage(run_context: RunContext, additional_vars: dict[str, Any], commands: Property[list[str]], replace_with_relative_path: bool) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def replace_internal_storage(run_context: RunContext, commands: list[str]) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def save_on_local_storage(run_context: RunContext, uri: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def upload_output_files(run_context: RunContext, output_dir: Path) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def script_commands(interpreter: list[str], before_commands: list[str], command: str) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def script_commands(interpreter: list[str], before_commands: list[str], commands: list[str]) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def script_commands(interpreter: list[str], before_commands: list[str], command: str, target_o_s: TargetOS) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def script_commands(interpreter: list[str], before_commands: list[str], commands: list[str], target_o_s: TargetOS) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def labels(run_context: RunContext, prefix: str) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def labels(run_context: RunContext, prefix: str, normalize_value: bool, lower_case: bool) -> dict[str, str]:
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
