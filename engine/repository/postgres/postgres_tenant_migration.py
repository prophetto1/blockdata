from __future__ import annotations

# Source: E:\KESTRA\jdbc-postgres\src\main\java\io\kestra\repository\postgres\PostgresTenantMigration.java
# WARNING: Unresolved types: DSLContext

from dataclasses import dataclass
from typing import Any

from engine.jdbc.repository.abstract_jdbc_tenant_migration import AbstractJdbcTenantMigration
from engine.jdbc.jooq_dsl_context_wrapper import JooqDSLContextWrapper
from engine.plugin.core.dashboard.chart.table import Table


@dataclass(slots=True, kw_only=True)
class PostgresTenantMigration(AbstractJdbcTenantMigration):

    def update_tenant_id_field(self, table: Table[Any], context: DSLContext) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def update_tenant_id_field_and_key(self, table: Table[Any], context: DSLContext) -> int:
        raise NotImplementedError  # TODO: translate from Java
