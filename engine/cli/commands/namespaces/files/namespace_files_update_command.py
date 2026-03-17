from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\namespaces\files\NamespaceFilesUpdateCommand.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from engine.cli.abstract_api_command import AbstractApiCommand
from engine.cli.services.tenant_id_selector_service import TenantIdSelectorService


@dataclass(slots=True, kw_only=True)
class NamespaceFilesUpdateCommand(AbstractApiCommand):
    delete: bool = False
    k_e_s_t_r_a__i_g_n_o_r_e__f_i_l_e: str = ".kestraignore"
    namespace: str | None = None
    from: Path | None = None
    to: str | None = None
    tenant_service: TenantIdSelectorService | None = None

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
