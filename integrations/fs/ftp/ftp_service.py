from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.fs.ftp.ftp_interface import FtpInterface
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class FtpService:

    def fs_options(self, run_context: RunContext, ftp_interface: FtpInterface) -> FileSystemOptions:
        raise NotImplementedError  # TODO: translate from Java

    def fs_options(self, instance: FtpFileSystemConfigBuilder, run_context: RunContext, ftp_interface: FtpInterface) -> FileSystemOptions:
        raise NotImplementedError  # TODO: translate from Java
