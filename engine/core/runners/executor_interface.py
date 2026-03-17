from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\ExecutorInterface.java
# WARNING: Unresolved types: Runnable

from typing import Any, Protocol

from engine.core.server.service import Service


class ExecutorInterface(Service, Runnable, Protocol):
    pass
