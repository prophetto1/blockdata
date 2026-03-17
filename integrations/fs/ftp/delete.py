from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fs\src\main\java\io\kestra\plugin\fs\ftp\Delete.java
# WARNING: Unresolved types: FileSystemOptions, IOException, Options, Proxy, fs, io, kestra, plugin, vfs

from dataclasses import dataclass
from typing import Any

from integrations.fs.ftp.ftp_interface import FtpInterface
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class Delete(Delete):
    """Delete a remote FTP file"""
    root_dir: Property[bool] = Property.ofValue(true)
    port: Property[str] = Property.ofValue("21")
    passive_mode: Property[bool] = Property.ofValue(true)
    remote_ip_verification: Property[bool] = Property.ofValue(true)
    options: Options = Options.builder().build()
    proxy_host: Property[str] | None = None
    proxy_port: Property[str] | None = None
    proxy_type: Property[Proxy.Type] | None = None

    def fs_options(self, run_context: RunContext) -> FileSystemOptions:
        raise NotImplementedError  # TODO: translate from Java

    def scheme(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
