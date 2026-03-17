from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\migrations\MigrationCommand.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from engine.cli.abstract_command import AbstractCommand
from engine.cli.commands.migrations.metadata.metadata_migration_command import MetadataMigrationCommand
from engine.cli.commands.migrations.tenant_migration_command import TenantMigrationCommand


@dataclass(slots=True, kw_only=True)
class MigrationCommand(AbstractCommand):

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
