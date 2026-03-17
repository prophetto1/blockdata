from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\templates\namespaces\TemplateNamespaceCommand.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from engine.cli.abstract_command import AbstractCommand
from engine.cli.commands.templates.namespaces.template_namespace_update_command import TemplateNamespaceUpdateCommand


@dataclass(slots=True, kw_only=True)
class TemplateNamespaceCommand(AbstractCommand):

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
