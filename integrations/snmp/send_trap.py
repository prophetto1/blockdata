from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-snmp\src\main\java\io\kestra\plugin\snmp\SendTrap.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.snmp.abstract_snmp_task import AbstractSnmpTask
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class SendTrap(AbstractSnmpTask):
    """Send SNMP trap to manager"""

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
