from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\flows\namespaces\FlowNamespaceCommand.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from engine.cli.abstract_command import AbstractCommand
from engine.cli.commands.flows.namespaces.flow_namespace_update_command import FlowNamespaceUpdateCommand


@dataclass(slots=True, kw_only=True)
class FlowNamespaceCommand(AbstractCommand):

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
