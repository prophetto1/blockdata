from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.fs.ftp.ftp_interface import FtpInterface
from integrations.fs.ftps.ftps_interface import FtpsInterface
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class FtpsService:

    def fs_options(self, run_context: RunContext, ftp_interface: FtpInterface, ftps_interface: FtpsInterface) -> FileSystemOptions:
        raise NotImplementedError  # TODO: translate from Java
