from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\TenantAndNamespace.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class TenantAndNamespace:
    tenant_id: str | None = None
    namespace: str | None = None
