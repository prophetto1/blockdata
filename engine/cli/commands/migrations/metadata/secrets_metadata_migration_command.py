from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\migrations\metadata\SecretsMetadataMigrationCommand.java
# WARNING: Unresolved types: Exception, Provider

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar

from engine.cli.abstract_command import AbstractCommand
from engine.cli.commands.migrations.metadata.metadata_migration_service import MetadataMigrationService


@dataclass(slots=True, kw_only=True)
class SecretsMetadataMigrationCommand(AbstractCommand):
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    metadata_migration_service_provider: Provider[MetadataMigrationService] | None = None

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
