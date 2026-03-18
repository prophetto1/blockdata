from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\http\client\configurations\SslOptions.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class SslOptions:
    insecure_trust_all_certificates: Property[bool] | None = None
