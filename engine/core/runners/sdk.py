from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\SDK.java

from dataclasses import dataclass
from typing import Any, Optional, Protocol


class SDK(Protocol):
    def default_authentication(self) -> Optional[Auth]: ...
