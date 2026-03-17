from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\input\FileInput.java
# WARNING: Unresolved types: ConstraintViolationException

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.flows.input import Input


@dataclass(slots=True, kw_only=True)
class FileInput(Input):
    d_e_f_a_u_l_t__e_x_t_e_n_s_i_o_n: ClassVar[str] = ".upl"
    extension: str | None = None
    allowed_file_extensions: list[str] | None = None

    def get_file_extension(self, uri: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def validate(self, input: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def find_file_input_extension(inputs: list[Input[Any]], file_name: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
