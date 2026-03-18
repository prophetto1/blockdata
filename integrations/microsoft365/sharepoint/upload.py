from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-microsoft365\src\main\java\io\kestra\plugin\microsoft365\sharepoint\Upload.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, ClassVar

from integrations.microsoft365.sharepoint.abstract_sharepoint_task import AbstractSharepointTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Upload(AbstractSharepointTask):
    """Upload file to SharePoint"""
    from: Property[str]
    to: Property[str]
    parent_id: Property[str] = Property.ofValue("root")
    conflict_behavior: ConflictBehavior = ConflictBehavior.FAIL
    chunk_size: Property[int] = Property.ofValue(5L * 1024 * 1024)
    s_i_m_p_l_e__u_p_l_o_a_d__s_i_z_e__l_i_m_i_t: ClassVar[int] = 4L * 1024 * 1024

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    class ConflictBehavior(str, Enum):
        FAIL = "FAIL"
        REPLACE = "REPLACE"
        RENAME = "RENAME"

    @dataclass(slots=True)
    class Output:
        item_id: str | None = None
        name: str | None = None
        web_url: str | None = None
        size: int | None = None
