from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fs\src\main\java\io\kestra\plugin\fs\vfs\KestraStandardFileSystemManager.java
# WARNING: Unresolved types: DefaultFileReplicator, StandardFileSystemManager

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class KestraStandardFileSystemManager(StandardFileSystemManager):
    c_o_n_f_i_g__r_e_s_o_u_r_c_e: ClassVar[str] = "providers.xml"
    run_context: RunContext | None = None

    def create_default_file_replicator(self) -> DefaultFileReplicator:
        raise NotImplementedError  # TODO: translate from Java
