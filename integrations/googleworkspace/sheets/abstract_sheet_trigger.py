from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\sheets\AbstractSheetTrigger.java
# WARNING: Unresolved types: Drive, Exception, Sheets

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractSheetTrigger(ABC, AbstractTrigger):
    a_p_p_l_i_c_a_t_i_o_n__n_a_m_e: ClassVar[str] = "Kestra"
    scopes: Property[list[str]] = Property.ofValue(Arrays.asList(
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/drive.metadata.readonly"
    ))
    service_account: Property[str] | None = None

    def sheets_connection(self, run_context: RunContext) -> Sheets:
        raise NotImplementedError  # TODO: translate from Java

    def drive_connection(self, run_context: RunContext) -> Drive:
        raise NotImplementedError  # TODO: translate from Java
