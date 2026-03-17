from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\AbstractServiceNamespaceUpdateCommand.java

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from engine.cli.abstract_api_command import AbstractApiCommand


@dataclass(slots=True, kw_only=True)
class AbstractServiceNamespaceUpdateCommand(AbstractApiCommand):
    delete: bool = False
    namespace: str | None = None
    directory: Path | None = None
