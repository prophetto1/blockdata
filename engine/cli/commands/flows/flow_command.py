from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\flows\FlowCommand.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from engine.cli.abstract_command import AbstractCommand
from engine.cli.commands.flows.flow_dot_command import FlowDotCommand
from engine.cli.commands.flows.flow_export_command import FlowExportCommand
from engine.cli.commands.flows.namespaces.flow_namespace_command import FlowNamespaceCommand
from engine.cli.commands.flows.flow_test_command import FlowTestCommand
from engine.cli.commands.flows.flow_update_command import FlowUpdateCommand
from engine.cli.commands.flows.flow_updates_command import FlowUpdatesCommand
from engine.cli.commands.flows.flow_validate_command import FlowValidateCommand
from engine.cli.commands.flows.flows_sync_from_source_command import FlowsSyncFromSourceCommand


@dataclass(slots=True, kw_only=True)
class FlowCommand(AbstractCommand):

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
