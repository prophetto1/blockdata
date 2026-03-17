from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\migrations\metadata\SecretsMetadataMigrationCommand.java
# WARNING: Unresolved types: Provider

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar

from engine.cli.abstract_command import AbstractCommand
from engine.cli.commands.migrations.metadata.metadata_migration_service import MetadataMigrationService


@dataclass(slots=True, kw_only=True)
class SecretsMetadataMigrationCommand(AbstractCommand):
    logger: ClassVar[Logger] = getLogger(__name__)
    metadata_migration_service_provider: Provider[MetadataMigrationService] | None = None

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
