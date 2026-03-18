from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fs\src\main\java\io\kestra\plugin\fs\ftps\Uploads.java
# WARNING: Unresolved types: FileSystemOptions, FtpsDataChannelProtectionLevel, FtpsMode, IOException, Options, Proxy, fs, io, kestra, plugin, vfs

from dataclasses import dataclass
from typing import Any

from integrations.fs.ftp.ftp_interface import FtpInterface
from integrations.fs.ftps.ftps_interface import FtpsInterface
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class Uploads(Uploads):
    """Upload multiple files to FTPS"""
    root_dir: Property[bool] = Property.ofValue(true)
    port: Property[str] = Property.ofValue("990")
    passive_mode: Property[bool] = Property.ofValue(true)
    remote_ip_verification: Property[bool] = Property.ofValue(true)
    options: Options = Options.builder().build()
    mode: Property[FtpsMode] = Property.ofValue(FtpsMode.EXPLICIT)
    data_channel_protection_level: Property[FtpsDataChannelProtectionLevel] = Property.ofValue(FtpsDataChannelProtectionLevel.P)
    proxy_host: Property[str] | None = None
    proxy_port: Property[str] | None = None
    proxy_type: Property[Proxy.Type] | None = None
    insecure_trust_all_certificates: Property[bool] | None = None

    def fs_options(self, run_context: RunContext) -> FileSystemOptions:
        raise NotImplementedError  # TODO: translate from Java

    def scheme(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
