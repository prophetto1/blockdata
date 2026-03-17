from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-spark\src\main\java\io\kestra\plugin\spark\SparkCLI.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.plugin.scripts.exec.abstract_exec_script import AbstractExecScript
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.plugin.scripts.exec.scripts.models.script_output import ScriptOutput


@dataclass(slots=True, kw_only=True)
class SparkCLI(AbstractExecScript):
    """Run Spark CLI commands"""
    commands: Property[list[str]]
    d_e_f_a_u_l_t__i_m_a_g_e: ClassVar[str] = "apache/spark:4.0.1-java21-r"
    container_image: Property[str] = Property.ofValue(DEFAULT_IMAGE)

    def run(self, run_context: RunContext) -> ScriptOutput:
        raise NotImplementedError  # TODO: translate from Java
