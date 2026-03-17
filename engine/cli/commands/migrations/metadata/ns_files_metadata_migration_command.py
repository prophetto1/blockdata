from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\migrations\metadata\NsFilesMetadataMigrationCommand.java
# WARNING: Unresolved types: Exception, Provider

from dataclasses import dataclass
from typing import Any

from engine.cli.abstract_command import AbstractCommand
from engine.cli.commands.migrations.metadata.metadata_migration_service import MetadataMigrationService


@dataclass(slots=True, kw_only=True)
class NsFilesMetadataMigrationCommand(AbstractCommand):
    log_migrations: bool = False
    metadata_migration_service_provider: Provider[MetadataMigrationService] | None = None

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
