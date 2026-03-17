from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\repositories\TenantMigrationInterface.java

from typing import Any, Protocol


class TenantMigrationInterface(Protocol):
    def migrate_tenant(self, tenant_id: str, dry_run: bool) -> None: ...
