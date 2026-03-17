from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.runners.run_context import RunContext
from integrations.fs.sftp.sftp_interface import SftpInterface


@dataclass(slots=True, kw_only=True)
class SftpService:

    def fs_options(self, run_context: RunContext, sftp_interface: SftpInterface) -> FileSystemOptions:
        raise NotImplementedError  # TODO: translate from Java
