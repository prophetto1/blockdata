from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.runners.run_context import RunContext
from integrations.fs.smb.smb_interface import SmbInterface


@dataclass(slots=True, kw_only=True)
class SmbService:

    def fs_options(self, run_context: RunContext, smb_interface: SmbInterface) -> FileSystemOptions:
        raise NotImplementedError  # TODO: translate from Java
