from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-snmp\src\main\java\io\kestra\plugin\snmp\SendInform.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.snmp.abstract_snmp_task import AbstractSnmpTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class SendInform(AbstractSnmpTask):
    """Send SNMP INFORM with acknowledgment"""
    retries: Property[int] = Property.ofValue(1)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        acknowledged: bool | None = None
        error: str | None = None
        response_text: str | None = None
