from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\TenantInterface.java

from typing import Any, Protocol


class TenantInterface(Protocol):
    def get_tenant_id(self) -> str: ...
