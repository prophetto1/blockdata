from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-git\src\main\java\io\kestra\plugin\git\Sync.java
# WARNING: Unresolved types: Exception, Logger, Pattern

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.git.abstract_cloning_task import AbstractCloningTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Sync(AbstractCloningTask):
    """Deprecated: sync flows and Namespace Files"""
    f_l_o_w_s__d_i_r_e_c_t_o_r_y: ClassVar[str] = "_flows"
    n_a_m_e_s_p_a_c_e__f_i_n_d_e_r__p_a_t_t_e_r_n: ClassVar[Pattern] = Pattern.compile("(?m)^namespace: (.*)$")
    f_l_o_w__i_d__f_i_n_d_e_r__p_a_t_t_e_r_n: ClassVar[Pattern] = Pattern.compile("(?m)^id: (.*)$")
    git_directory: Property[str] | None = None
    namespace_files_directory: Property[str] | None = None
    branch: Property[str] | None = None
    dry_run: Property[bool] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def log_deletion(logger: Logger, path: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def log_addition(logger: Logger, path: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def log_update(logger: Logger, path: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_url(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java
