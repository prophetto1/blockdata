from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\services\TenantIdSelectorService.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class TenantIdSelectorService:

    def get_tenant_id(self, tenant_id: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def get_tenant_id_and_allow_ee_tenants(self, tenant_id: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def create_tenant(self, tenant_id: str) -> None:
        raise NotImplementedError  # TODO: translate from Java
