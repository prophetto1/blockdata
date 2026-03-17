from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol
from datetime import timedelta

from engine.core.models.property.property import Property


class FtpInterface(Protocol):
    def get_proxy_host(self) -> Property[str]: ...
    def get_proxy_port(self) -> Property[str]: ...
    def get_proxy_type(self) -> Property[Proxy]: ...
    def get_root_dir(self) -> Property[bool]: ...
    def get_passive_mode(self) -> Property[bool]: ...
    def get_remote_ip_verification(self) -> Property[bool]: ...
    def get_options(self) -> Options: ...


@dataclass(slots=True, kw_only=True)
class Options:
    connection_timeout: Property[timedelta] | None = None
    data_timeout: Property[timedelta] | None = None
    socket_timeout: Property[timedelta] | None = None
    control_keep_alive_timeout: Property[timedelta] | None = None
    control_keep_alive_reply_timeout: Property[timedelta] | None = None
