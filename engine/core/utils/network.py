from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\Network.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Network:
    h_o_s_t_n_a_m_e: str | None = None

    @staticmethod
    def local_hostname() -> str:
        raise NotImplementedError  # TODO: translate from Java
