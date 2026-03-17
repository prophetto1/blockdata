from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class KestraStandardFileSystemManager(StandardFileSystemManager):
    c_o_n_f_i_g__r_e_s_o_u_r_c_e: str | None = None
    run_context: RunContext | None = None

    def create_default_file_replicator(self) -> DefaultFileReplicator:
        raise NotImplementedError  # TODO: translate from Java
