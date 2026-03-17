from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.fs.sftp.sftp_interface import SftpInterface


@dataclass(slots=True, kw_only=True)
class Move(io, SftpInterface):
    """Move or rename an SFTP file"""
    keyfile: Property[str] | None = None
    passphrase: Property[str] | None = None
    proxy_host: Property[str] | None = None
    proxy_address: Property[str] | None = None
    proxy_port: Property[str] | None = None
    proxy_user: Property[str] | None = None
    proxy_username: Property[str] | None = None
    proxy_password: Property[str] | None = None
    proxy_type: Property[str] | None = None
    root_dir: Property[bool] | None = None
    port: Property[str] | None = None
    key_exchange_algorithm: Property[str] | None = None

    def fs_options(self, run_context: RunContext) -> FileSystemOptions:
        raise NotImplementedError  # TODO: translate from Java

    def scheme(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
