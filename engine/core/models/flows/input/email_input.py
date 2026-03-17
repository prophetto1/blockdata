from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\input\EmailInput.java
# WARNING: Unresolved types: ConstraintViolationException

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.models.flows.input import Input


@dataclass(slots=True, kw_only=True)
class EmailInput(Input):
    e_m_a_i_l__p_a_t_t_e_r_n: ClassVar[str] = "^$|^[a-zA-Z0-9_!#$%&’*+/=?`{|}~^.-]+@[a-zA-Z0-9.-]+$"

    def validate(self, input: str) -> None:
        raise NotImplementedError  # TODO: translate from Java
