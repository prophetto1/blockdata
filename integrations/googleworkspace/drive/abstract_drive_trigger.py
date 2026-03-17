from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\drive\AbstractDriveTrigger.java
# WARNING: Unresolved types: Drive, Exception

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.airbyte.cloud.jobs.abstract_trigger import AbstractTrigger
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractDriveTrigger(ABC, AbstractTrigger):
    a_p_p_l_i_c_a_t_i_o_n__n_a_m_e: ClassVar[str] = "Kestra"
    d_r_i_v_e__s_c_o_p_e: ClassVar[str] = "https://www.googleapis.com/auth/drive"
    service_account: Property[str] | None = None

    def from(self, run_context: RunContext) -> Drive:
        raise NotImplementedError  # TODO: translate from Java
