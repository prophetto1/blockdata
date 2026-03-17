from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\IdUtils.java
# WARNING: Unresolved types: HashFunction

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class IdUtils(ABC):
    h_a_s_h__f_u_n_c_t_i_o_n: ClassVar[HashFunction] = Hashing.md5()
    i_d__s_e_p_a_r_a_t_o_r: ClassVar[str] = '_'

    @staticmethod
    def create() -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from(from: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from_parts() -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from_parts_and_separator(separator: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
