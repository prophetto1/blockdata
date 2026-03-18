from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fs\src\main\java\io\kestra\plugin\fs\ftp\FtpInterface.java
# WARNING: Unresolved types: Proxy

from dataclasses import dataclass
from datetime import timedelta
from typing import Any, Protocol

from engine.core.models.property.property import Property
from engine.core.models.flows.type import Type


class FtpInterface(Protocol):
    def get_proxy_host(self) -> Property[str]: ...

    def get_proxy_port(self) -> Property[str]: ...

    def get_proxy_type(self) -> Property[Proxy.Type]: ...

    def get_root_dir(self) -> Property[bool]: ...

    def get_passive_mode(self) -> Property[bool]: ...

    def get_remote_ip_verification(self) -> Property[bool]: ...

    def get_options(self) -> Options: ...
