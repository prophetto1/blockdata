from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\repository\AbstractJdbcTenantMigration.java
# WARNING: Unresolved types: DSLContext

from dataclasses import dataclass
from typing import Any

from engine.jdbc.jooq_d_s_l_context_wrapper import JooqDSLContextWrapper
from engine.plugin.core.dashboard.chart.table import Table
from engine.core.repositories.tenant_migration_interface import TenantMigrationInterface


@dataclass(slots=True, kw_only=True)
class AbstractJdbcTenantMigration:
    k_e_y__t_a_b_l_e_s: list[str] = List.of("dashboards", "flows", "multipleconditions",
        "namespaces", "testsuites", "triggers", "templates")
    dsl_context_wrapper: JooqDSLContextWrapper | None = None

    def migrate_tenant(self, tenant_id: str, dry_run: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def migrate(self, dry_run: bool) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def table_with_key(table_name: str) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    def update_tenant_id_field(self, table: Table[Any], context: DSLContext) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def update_tenant_id_field_and_key(self, table: Table[Any], context: DSLContext) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def delete_tutorial_flows(self, table: Table[Any], context: DSLContext) -> int:
        raise NotImplementedError  # TODO: translate from Java
