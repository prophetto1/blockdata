from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\SDK.java

from typing import Any, Protocol


class SDK(Protocol):
    def default_authentication(self) -> Optional[Auth]: ...
