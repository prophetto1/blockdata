from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-ldap\src\main\java\io\kestra\plugin\ldap\Utils.java
# WARNING: Unresolved types: IOException, IllegalArgumentException, IonException, IonReader, LDIFReader, NullPointerException

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Utils:

    @staticmethod
    def resolve_kestra_uri(file: str, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_l_d_i_f_reader_from_uri(file: str, run_context: RunContext) -> LDIFReader:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_i_o_n_reader_from_uri(file: str, run_context: RunContext) -> IonReader:
        raise NotImplementedError  # TODO: translate from Java
