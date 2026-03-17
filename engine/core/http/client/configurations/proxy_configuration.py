from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\http\client\configurations\ProxyConfiguration.java
# WARNING: Unresolved types: Proxy, java, net

from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class ProxyConfiguration:
    type: Property[java.net.Proxy.Type] = Property.ofValue(Proxy.Type.DIRECT)
    address: Property[str] | None = None
    port: Property[int] | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None
