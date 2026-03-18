from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-odoo\src\main\java\io\kestra\plugin\odoo\OdooAuthenticator.java
# WARNING: Unresolved types: Exception, MalformedURLException, XmlRpcClient, java, util

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class OdooAuthenticator:
    url: str | None = None
    database: str | None = None
    username: str | None = None
    password: str | None = None
    common_client: XmlRpcClient | None = None

    def authenticate(self) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def get_version(self) -> java.util.Map[str, Any]:
        raise NotImplementedError  # TODO: translate from Java
