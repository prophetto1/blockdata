from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\migrations\metadata\MetadataMigrationCommand.java

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar

from engine.cli.abstract_command import AbstractCommand
from engine.cli.commands.migrations.metadata.kv_metadata_migration_command import KvMetadataMigrationCommand
from engine.cli.commands.migrations.metadata.ns_files_metadata_migration_command import NsFilesMetadataMigrationCommand
from engine.cli.commands.migrations.metadata.secrets_metadata_migration_command import SecretsMetadataMigrationCommand


@dataclass(slots=True, kw_only=True)
class MetadataMigrationCommand(AbstractCommand):
    logger: ClassVar[Logger] = getLogger(__name__)

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
