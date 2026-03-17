from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.fs.ftp.ftp_interface import FtpInterface
from integrations.fs.ftps.ftps_interface import FtpsInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Download(io, FtpInterface, FtpsInterface):
    """Download a file from FTPS"""
    proxy_host: Property[str] | None = None
    proxy_port: Property[str] | None = None
    proxy_type: Property[Proxy] | None = None
    root_dir: Property[bool] | None = None
    port: Property[str] | None = None
    passive_mode: Property[bool] | None = None
    remote_ip_verification: Property[bool] | None = None
    options: Options | None = None
    mode: Property[FtpsMode] | None = None
    data_channel_protection_level: Property[FtpsDataChannelProtectionLevel] | None = None
    insecure_trust_all_certificates: Property[bool] | None = None

    def fs_options(self, run_context: RunContext) -> FileSystemOptions:
        raise NotImplementedError  # TODO: translate from Java

    def scheme(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
