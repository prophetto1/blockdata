from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class GenericData:
    g_e_n_e_r_i_c__d_a_t_a: org | None = None

    def get(self) -> org:
        raise NotImplementedError  # TODO: translate from Java
