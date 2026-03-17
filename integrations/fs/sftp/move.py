from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fs\src\main\java\io\kestra\plugin\fs\sftp\Move.java
# WARNING: Unresolved types: FileSystemOptions, IOException, fs, io, kestra, plugin, vfs

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.fs.sftp.sftp_interface import SftpInterface


@dataclass(slots=True, kw_only=True)
class Move(Move):
    """Move or rename an SFTP file"""
    root_dir: Property[bool] = Property.ofValue(true)
    port: Property[str] = Property.ofValue("22")
    keyfile: Property[str] | None = None
    passphrase: Property[str] | None = None
    proxy_host: Property[str] | None = None
    proxy_address: Property[str] | None = None
    proxy_port: Property[str] | None = None
    proxy_user: Property[str] | None = None
    proxy_username: Property[str] | None = None
    proxy_password: Property[str] | None = None
    proxy_type: Property[str] | None = None
    key_exchange_algorithm: Property[str] | None = None

    def fs_options(self, run_context: RunContext) -> FileSystemOptions:
        raise NotImplementedError  # TODO: translate from Java

    def scheme(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
