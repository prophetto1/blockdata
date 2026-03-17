from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\Network.java

from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class Network:
    h_o_s_t_n_a_m_e: ClassVar[str]

    @staticmethod
    def local_hostname() -> str:
        raise NotImplementedError  # TODO: translate from Java
