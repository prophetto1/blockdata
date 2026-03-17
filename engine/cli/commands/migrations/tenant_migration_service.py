from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\migrations\TenantMigrationService.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.repositories.flow_repository_interface import FlowRepositoryInterface
from engine.core.queues.queue_interface import QueueInterface
from engine.core.repositories.tenant_migration_interface import TenantMigrationInterface


@dataclass(slots=True, kw_only=True)
class TenantMigrationService:
    tenant_migration_interface: TenantMigrationInterface | None = None
    flow_repository: FlowRepositoryInterface | None = None
    flow_queue: QueueInterface[FlowInterface] | None = None

    def migrate_tenant(self, tenant_id: str, tenant_name: str, dry_run: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def migrate_queue(self, dry_run: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java
