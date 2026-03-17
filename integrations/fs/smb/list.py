from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.fs.smb.smb_interface import SmbInterface


@dataclass(slots=True, kw_only=True)
class List(io, SmbInterface):
    """List files on an SMB share"""
    port: Property[str] | None = None

    def fs_options(self, run_context: RunContext) -> FileSystemOptions:
        raise NotImplementedError  # TODO: translate from Java

    def scheme(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
