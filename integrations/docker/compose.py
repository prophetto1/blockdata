from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-docker\src\main\java\io\kestra\plugin\docker\Compose.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, ClassVar

from engine.plugin.scripts.exec.abstract_exec_script import AbstractExecScript
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.plugin.scripts.exec.scripts.models.script_output import ScriptOutput


@dataclass(slots=True, kw_only=True)
class Compose(AbstractExecScript):
    """Run Docker Compose with inline or stored files"""
    compose_args: Property[list[str]]
    d_e_f_a_u_l_t__i_m_a_g_e: ClassVar[str] = "docker:latest"
    container_image: Property[str] = Property.ofValue(DEFAULT_IMAGE)
    compose_file: Property[str] | None = None
    compose_files: Property[list[str]] | None = None

    def run(self, run_context: RunContext) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java

    def resolve_compose_files(self, run_context: RunContext) -> list[Path]:
        raise NotImplementedError  # TODO: translate from Java
