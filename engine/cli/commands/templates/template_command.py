from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\templates\TemplateCommand.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar

from engine.cli.abstract_command import AbstractCommand
from engine.cli.commands.templates.template_export_command import TemplateExportCommand
from engine.cli.commands.templates.namespaces.template_namespace_command import TemplateNamespaceCommand
from engine.cli.commands.templates.template_validate_command import TemplateValidateCommand


@dataclass(slots=True, kw_only=True)
class TemplateCommand(AbstractCommand):
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)

    def call(self) -> int:
        raise NotImplementedError  # TODO: translate from Java
